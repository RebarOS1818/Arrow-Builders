-- Per-seat billing.
--
-- Seats are counted as profiles attached to an organization. The plan's
-- seat_limit is the ceiling; invites are refused once seats are full, enforced
-- in the database (not just the UI) so the limit holds no matter which client
-- issues the insert.

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

-- Only admins may see billing detail or manage members.
alter table profiles
  add column is_admin boolean not null default false;

-- ---------------------------------------------------------------- invites
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

-- One live invite per email per org; accepted/revoked rows may repeat.
create unique index org_invites_pending_email
  on org_invites (org_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index on org_invites (org_id);

-- ---------------------------------------------------------------- seat maths
-- Seats in use = members + invites still outstanding. Counting pending invites
-- stops an org from issuing 50 invitations against 3 seats and overshooting the
-- moment they are all accepted.
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

-- Refuse an invite that would exceed the plan. Raised as an exception so the
-- limit is enforced for every caller, including the SQL editor and any future
-- service-role code path.
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

-- ---------------------------------------------------------------- RLS
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

-- Billing columns are written only by the Stripe webhook (service role, which
-- bypasses RLS). Members may read their organization but never change its plan.
create policy "org admins update org"
  on organizations for update to authenticated
  using (
    id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (id = current_org_id());

-- The first member of an organization becomes its admin.
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

-- ---------------------------------------------------------------- acceptance
-- Sign-up consumes a matching invite: the new profile joins that organization
-- and the invite is marked accepted in the same statement. Seats stay balanced
-- because org_seats_used counts members plus pending invites, and this converts
-- exactly one pending invite into exactly one member.
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
