-- Arrow Builders — core schema
-- Every table is scoped to an organization; RLS restricts rows to the
-- organization of the signed-in user's profile.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type project_status as enum ('on_schedule', 'behind_schedule', 'at_risk', 'complete');
create type task_status as enum ('unscheduled', 'scheduled', 'in_progress', 'blocked', 'done');
create type trade as enum ('general', 'concrete', 'electrical', 'plumbing', 'finishes');
create type approval_kind as enum ('change_order', 'payment_application', 'submittal', 'rfq', 'rfi');
create type approval_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------- tables
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  org_id uuid references organizations on delete set null,
  full_name text not null default '',
  initials text not null default '',
  role text not null default 'Crew',
  trade trade,
  avatar_url text,
  on_site_today boolean not null default false,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  name text not null,
  city text not null default '',
  state text not null default '',
  status project_status not null default 'on_schedule',
  completion_pct int not null default 0 check (completion_pct between 0 and 100),
  budget_spent numeric(14, 2) not null default 0,
  budget_total numeric(14, 2) not null default 0,
  target_date date,
  cover_url text,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  title text not null,
  trade trade not null default 'general',
  status task_status not null default 'unscheduled',
  starts_at date,
  ends_at date,
  crew_size int not null default 0,
  overdue boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  title text not null,
  trade trade not null default 'general',
  starts_at date not null,
  ends_at date not null
);

create table schedule_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  crew_size int not null default 0
);

create table event_crew (
  event_id uuid not null references schedule_events on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  primary key (event_id, profile_id)
);

create table task_crew (
  task_id uuid not null references tasks on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  primary key (task_id, profile_id)
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  kind approval_kind not null,
  reference text not null,
  amount numeric(14, 2),
  status approval_status not null default 'pending',
  submitted_at timestamptz not null default now()
);

create table cash_flow (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  period date not null,
  inflow numeric(14, 2) not null default 0,
  outflow numeric(14, 2) not null default 0,
  unique (org_id, period)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  name text not null,
  category text not null default 'General',
  size_kb int not null default 0,
  storage_path text,
  uploaded_by text not null default '',
  uploaded_at timestamptz not null default now()
);

create index on projects (org_id);
create index on tasks (org_id, project_id);
create index on tasks (org_id, starts_at);
create index on milestones (org_id, starts_at);
create index on schedule_events (org_id, scheduled_at);
create index on approvals (org_id, status);
create index on documents (org_id, project_id);

-- ---------------------------------------------------------------- helpers
-- security definer so the policies below can read profiles without recursing
-- through profiles' own RLS policy.
create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

-- Every new auth user gets a profile row.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- RLS
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table milestones enable row level security;
alter table schedule_events enable row level security;
alter table event_crew enable row level security;
alter table task_crew enable row level security;
alter table approvals enable row level security;
alter table cash_flow enable row level security;
alter table documents enable row level security;

create policy "members read their org"
  on organizations for select to authenticated
  using (id = current_org_id());

create policy "members read org profiles"
  on profiles for select to authenticated
  using (org_id = current_org_id() or id = auth.uid());

create policy "users update own profile"
  on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Org-scoped tables share the same read/write shape.
do $$
declare t text;
begin
  foreach t in array array[
    'projects', 'tasks', 'milestones', 'schedule_events',
    'approvals', 'cash_flow', 'documents'
  ]
  loop
    execute format(
      'create policy "org members read %1$s" on %1$I for select to authenticated
         using (org_id = current_org_id())', t);
    execute format(
      'create policy "org members write %1$s" on %1$I for insert to authenticated
         with check (org_id = current_org_id())', t);
    execute format(
      'create policy "org members update %1$s" on %1$I for update to authenticated
         using (org_id = current_org_id()) with check (org_id = current_org_id())', t);
    execute format(
      'create policy "org members delete %1$s" on %1$I for delete to authenticated
         using (org_id = current_org_id())', t);
  end loop;
end $$;

-- Join tables inherit access from their parent row.
create policy "org members read event crew"
  on event_crew for select to authenticated
  using (exists (
    select 1 from schedule_events e
    where e.id = event_crew.event_id and e.org_id = current_org_id()
  ));

create policy "org members write event crew"
  on event_crew for all to authenticated
  using (exists (
    select 1 from schedule_events e
    where e.id = event_crew.event_id and e.org_id = current_org_id()
  ))
  with check (exists (
    select 1 from schedule_events e
    where e.id = event_crew.event_id and e.org_id = current_org_id()
  ));

create policy "org members read task crew"
  on task_crew for select to authenticated
  using (exists (
    select 1 from tasks t
    where t.id = task_crew.task_id and t.org_id = current_org_id()
  ));

create policy "org members write task crew"
  on task_crew for all to authenticated
  using (exists (
    select 1 from tasks t
    where t.id = task_crew.task_id and t.org_id = current_org_id()
  ))
  with check (exists (
    select 1 from tasks t
    where t.id = task_crew.task_id and t.org_id = current_org_id()
  ));
