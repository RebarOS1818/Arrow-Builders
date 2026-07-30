-- Security fixes for the per-seat billing work in 0003.
--
-- Four holes, all found by reviewing 0003 rather than in production:
--
--   1. profiles.is_admin was writable by its owner, because the "users update
--      own profile" policy from 0001 grants row-level UPDATE and RLS cannot
--      restrict columns. Anyone could self-promote to org admin.
--   2. "org admins update org" granted UPDATE on the whole organizations row,
--      so an admin could raise their own seat_limit and stop paying for seats —
--      the exact control 0003 exists to enforce.
--   3. handle_new_user() consumed an invite by matching the sign-up email, with
--      no proof the signer owned that mailbox. Invites now carry a secret token
--      and are redeemed explicitly, which also removes the dependency on email
--      delivery entirely.
--   4. org_seats_used/available took the organization as an argument and were
--      callable by any authenticated role, leaking another tenant's headcount.

-- ============================================================ 1. lock is_admin
create or replace function prevent_self_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_admin is distinct from old.is_admin then
    raise exception 'is_admin cannot be changed by the profile owner';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_admin
  before update on profiles
  for each row execute function prevent_self_admin();

-- Belt and braces: remove the column privilege as well, so the write is refused
-- before any trigger runs. Supabase grants table-wide UPDATE to authenticated by
-- default, so this has to be revoked and re-granted per column.
revoke update on profiles from authenticated;
grant update (full_name, initials, avatar_url, on_site_today, trade) on profiles to authenticated;

-- ======================================================= 2. lock billing columns
-- Billing state has exactly one legitimate writer: the Stripe webhook, which
-- uses the service-role key and bypasses RLS. Nothing client-side needs it.
drop policy if exists "org admins update org" on organizations;

revoke update on organizations from authenticated;
grant update (name, slug) on organizations to authenticated;

create policy "org admins rename org"
  on organizations for update to authenticated
  using (
    id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (id = current_org_id());

-- ========================================================== 3. token invites
alter table org_invites
  add column token text not null default
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

create unique index org_invites_token on org_invites (token);

-- Tokens are credentials, so members must not be able to read each other's.
-- Admins manage invites; everyone else redeems through the functions below.
drop policy if exists "org members read invites" on org_invites;

create policy "org admins read invites"
  on org_invites for select to authenticated
  using (
    org_id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Sign-up no longer joins an organization. Email is not proof of invitation, so
-- membership is granted only by redeeming a token.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, initials)
  values (new.id, display_name, upper(left(display_name, 2)));

  return new;
end;
$$;

-- The 0002 lock stops users moving themselves between organizations. Redemption
-- has to set org_id once, so it opens a transaction-local exemption that only
-- accept_invite() can set — PostgREST exposes no way to call set_config directly.
create or replace function prevent_profile_org_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_org_change', true), 'off') = 'on' then
    return new;
  end if;

  if auth.uid() is not null and new.org_id is distinct from old.org_id then
    raise exception 'org_id cannot be changed by the profile owner';
  end if;

  return new;
end;
$$;

/**
 * Shows who an invite is for without exposing the invitee's email, so the
 * redemption page can say "You have been invited to X" before sign-in.
 */
create or replace function invite_preview(invite_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare inv record;
begin
  select i.role, o.name as org_name
    into inv
    from org_invites i
    join organizations o on o.id = i.org_id
   where i.token = invite_token
     and i.accepted_at is null
     and i.revoked_at is null;

  if inv is null then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object('valid', true, 'org', inv.org_name, 'role', inv.role);
end;
$$;

/**
 * Redeems an invite for the signed-in caller. Possession of the token is the
 * proof of invitation; the email on the invite is never compared to the
 * account's, so a mistyped address cannot lock anyone out.
 *
 * Seats stay balanced: this converts one pending invite into one member, and
 * org_seats_used counts both.
 */
create or replace function accept_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  org_name text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select * into inv
    from org_invites
   where token = invite_token
     and accepted_at is null
     and revoked_at is null
   for update;

  if inv is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_used');
  end if;

  if exists (select 1 from profiles where id = auth.uid() and org_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  perform set_config('app.allow_org_change', 'on', true);
  update profiles
     set org_id = inv.org_id,
         role = inv.role
   where id = auth.uid();
  perform set_config('app.allow_org_change', 'off', true);

  update org_invites set accepted_at = now() where id = inv.id;

  select name into org_name from organizations where id = inv.org_id;
  return jsonb_build_object('ok', true, 'org', org_name);
end;
$$;

-- ==================================================== 4. scope seat functions
-- The parameterised versions stay for the seat trigger, which must check the
-- row being inserted, but they are no longer reachable from a client.
revoke execute on function org_seats_used(uuid) from authenticated, anon, public;
revoke execute on function org_seats_available(uuid) from authenticated, anon, public;

-- Callers get their own organization only, derived from the session.
create or replace function org_seats_used()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from profiles where org_id = current_org_id())
    + (select count(*) from org_invites
       where org_id = current_org_id()
         and accepted_at is null and revoked_at is null);
$$;

create or replace function org_seats_available()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, coalesce(
    (select seat_limit from organizations where id = current_org_id()), 0
  ) - org_seats_used());
$$;

grant execute on function org_seats_used() to authenticated;
grant execute on function org_seats_available() to authenticated;
grant execute on function invite_preview(text) to authenticated, anon;
grant execute on function accept_invite(text) to authenticated;
