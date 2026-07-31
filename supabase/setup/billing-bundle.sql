create type subscription_status as enum (
  'none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'
);
alter table organizations
  add column plan text not null default 'starter',
  add column seat_limit int not null default 3 check (seat_limit >= 0),
  add column price_per_seat_cents int not null default 2900,
  add column subscription_status subscription_status not null default 'none',
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column current_period_end timestamptz;
alter table profiles
  add column is_admin boolean not null default false;
create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  email text not null,
  role text not null default 'Crew',
  invited_by uuid references profiles on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index org_invites_pending_email
  on org_invites (org_id, lower(email))
  where accepted_at is null and revoked_at is null;
create index on org_invites (org_id);
create or replace function org_seats_used(target_org uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from profiles where org_id = target_org)
    + (select count(*) from org_invites
       where org_id = target_org and accepted_at is null and revoked_at is null);
$$;
create or replace function org_seats_available(target_org uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, (select seat_limit from organizations where id = target_org)
                     - org_seats_used(target_org));
$$;
create or replace function enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if org_seats_available(new.org_id) <= 0 then
    raise exception 'seat limit reached for this organization'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger org_invites_seat_limit
  before insert on org_invites
  for each row execute function enforce_seat_limit();
alter table org_invites enable row level security;
create policy "org members read invites"
  on org_invites for select to authenticated
  using (org_id = current_org_id());
create policy "org admins write invites"
  on org_invites for insert to authenticated
  with check (
    org_id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "org admins update invites"
  on org_invites for update to authenticated
  using (
    org_id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (org_id = current_org_id());
create policy "org admins update org"
  on organizations for update to authenticated
  using (
    id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (id = current_org_id());
create or replace function promote_first_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.org_id is not null
     and not exists (
       select 1 from profiles
       where org_id = new.org_id and is_admin and id <> new.id
     )
  then
    new.is_admin := true;
  end if;
  return new;
end;
$$;
create trigger profiles_promote_first_member
  before insert or update of org_id on profiles
  for each row execute function promote_first_member();
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );
  select * into invite
  from org_invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and revoked_at is null
  order by created_at
  limit 1;
  insert into public.profiles (id, org_id, full_name, initials, role)
  values (
    new.id,
    invite.org_id,
    display_name,
    upper(left(display_name, 2)),
    coalesce(invite.role, 'Crew')
  );
  if invite.id is not null then
    update org_invites set accepted_at = now() where id = invite.id;
  end if;
  return new;
end;
$$;

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
revoke update on profiles from authenticated;
grant update (full_name, initials, avatar_url, on_site_today, trade) on profiles to authenticated;
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
alter table org_invites
  add column token text not null default
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
create unique index org_invites_token on org_invites (token);
drop policy if exists "org members read invites" on org_invites;
create policy "org admins read invites"
  on org_invites for select to authenticated
  using (
    org_id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
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
revoke execute on function org_seats_used(uuid) from authenticated, anon, public;
revoke execute on function org_seats_available(uuid) from authenticated, anon, public;
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

alter type subscription_status add value if not exists 'unpaid';
alter type subscription_status add value if not exists 'paused';
alter type subscription_status add value if not exists 'incomplete_expired';
create or replace function enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_seats int;
  used_seats int;
begin
  select seat_limit into limit_seats
    from organizations
   where id = new.org_id
     for update;
  if limit_seats is null then
    raise exception 'organization % does not exist', new.org_id
      using errcode = 'foreign_key_violation';
  end if;
  select (select count(*) from profiles where org_id = new.org_id)
       + (select count(*) from org_invites
          where org_id = new.org_id
            and accepted_at is null
            and revoked_at is null)
    into used_seats;
  if used_seats >= limit_seats then
    raise exception 'seat limit reached for this organization'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'organizations'
       and column_name = 'price_per_seat_cents'
  ) and not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'organizations'
       and column_name = 'price_cents'
  ) then
    alter table organizations rename column price_per_seat_cents to price_cents;
  end if;
end $$;
comment on column organizations.price_cents is
  'Flat monthly fee for the whole organization, not a per-user rate. Written by the Stripe webhook from the Price, so the app never displays a figure the customer is not actually charged.';
comment on column organizations.seat_limit is
  'Users included in the plan. Set from the Stripe Price metadata by the webhook.';
alter table organizations
  alter column price_cents set default 0;
alter table organizations
  alter column seat_limit set default 3;
update organizations
   set seat_limit = 50
 where stripe_subscription_id is not null
   and seat_limit < 50;
