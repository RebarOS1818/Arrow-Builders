-- Development phase: assessing a property, deciding whether it can be built on,
-- and deciding whether the price makes sense.
--
-- This is the work that happens *before* a project exists. A property is a
-- candidate; only some become projects. Keeping them as separate tables means a
-- passed-on parcel stays on file with its research intact, which is the whole
-- point of doing the research.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------- helper
-- Every org-scoped table needs the same four policies. 0001 wrote them with an
-- inline loop; this exposes the same thing as a function so each new table is
-- one call rather than four hand-written policies — which is exactly where a
-- tenant-isolation hole gets in.
create or replace function apply_org_rls(target regclass)
returns void
language plpgsql
as $$
declare
  t text := target::text;
begin
  execute format('alter table %s enable row level security', t);

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = target::regclass::text
       and policyname = 'org members read'
  ) then
    execute format(
      'create policy "org members read" on %s for select to authenticated
         using (org_id = current_org_id())', t);
    execute format(
      'create policy "org members insert" on %s for insert to authenticated
         with check (org_id = current_org_id())', t);
    execute format(
      'create policy "org members update" on %s for update to authenticated
         using (org_id = current_org_id()) with check (org_id = current_org_id())', t);
    execute format(
      'create policy "org members delete" on %s for delete to authenticated
         using (org_id = current_org_id())', t);
  end if;
end;
$$;

-- Schema surgery, not something an app user should ever call.
revoke execute on function apply_org_rls(regclass) from public, anon, authenticated;

-- ---------------------------------------------------------------- enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type property_status as enum (
      'prospect', 'under_review', 'under_contract', 'acquired', 'passed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'study_kind') then
    create type study_kind as enum (
      'zoning', 'environmental', 'geotechnical', 'utilities', 'traffic',
      'title', 'survey', 'floodplain'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'study_status') then
    create type study_status as enum ('not_started', 'in_progress', 'complete', 'blocked');
  end if;

  -- The answer the study actually gives, kept separate from whether it is done.
  -- A finished study that says "no" is not the same as one still running.
  if not exists (select 1 from pg_type where typname = 'study_verdict') then
    create type study_verdict as enum ('favorable', 'conditional', 'unfavorable');
  end if;

  if not exists (select 1 from pg_type where typname = 'constraint_severity') then
    create type constraint_severity as enum ('informational', 'minor', 'major', 'fatal');
  end if;

  if not exists (select 1 from pg_type where typname = 'offer_status') then
    create type offer_status as enum (
      'draft', 'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'proforma_status') then
    create type proforma_status as enum ('draft', 'under_review', 'approved', 'rejected');
  end if;
end $$;

-- ---------------------------------------------------------------- properties
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  name text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  -- Assessor's parcel number: the county's identifier, and how you reconcile
  -- with public records.
  parcel_number text,
  lot_size_acres numeric(10, 4),
  zoning_code text,
  -- What the seller wants. The pro forma decides whether that is reasonable.
  asking_price numeric(14, 2),
  status property_status not null default 'prospect',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  notes text not null default '',
  identified_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists properties_org_status_idx on properties (org_id, status);
create unique index if not exists properties_org_parcel_idx
  on properties (org_id, parcel_number) where parcel_number is not null;

-- ---------------------------------------------------------- feasibility
create table if not exists feasibility_studies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  property_id uuid not null references properties on delete cascade,
  kind study_kind not null,
  status study_status not null default 'not_started',
  -- Null until the study concludes; a verdict without completion is meaningless.
  verdict study_verdict,
  findings text not null default '',
  cost numeric(14, 2),
  consultant text not null default '',
  ordered_at date,
  completed_at date,
  assessed_by uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  constraint verdict_requires_completion
    check (verdict is null or status = 'complete')
);

create index if not exists feasibility_property_idx on feasibility_studies (org_id, property_id);

-- One study of each kind per property. Re-running one supersedes it rather than
-- accumulating contradictory answers to the same question.
create unique index if not exists feasibility_property_kind_idx
  on feasibility_studies (property_id, kind);

-- Specific things found that limit what can be built.
create table if not exists site_constraints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  property_id uuid not null references properties on delete cascade,
  kind text not null,
  severity constraint_severity not null default 'minor',
  description text not null default '',
  affects_buildable_area boolean not null default false,
  resolved boolean not null default false,
  resolution_notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists site_constraints_property_idx
  on site_constraints (org_id, property_id, resolved);

-- ------------------------------------------------------------- pro forma
-- Whether the numbers work. Several scenarios per property is normal — the
-- point is to compare them, so they are rows rather than columns.
create table if not exists pro_formas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  property_id uuid not null references properties on delete cascade,
  scenario text not null default 'Base case',
  status proforma_status not null default 'draft',
  planned_units int not null default 0 check (planned_units >= 0),
  planned_sqft int not null default 0 check (planned_sqft >= 0),
  acquisition_cost numeric(14, 2) not null default 0,
  hard_costs numeric(14, 2) not null default 0,
  soft_costs numeric(14, 2) not null default 0,
  financing_costs numeric(14, 2) not null default 0,
  contingency_pct numeric(5, 2) not null default 0 check (contingency_pct >= 0),
  projected_revenue numeric(14, 2) not null default 0,
  target_margin_pct numeric(5, 2) not null default 0,
  -- Derived, so the arithmetic cannot drift from the inputs. Contingency is a
  -- percentage of the costs it protects, not of revenue.
  total_cost numeric(14, 2) generated always as (
    acquisition_cost + financing_costs
      + (hard_costs + soft_costs) * (1 + contingency_pct / 100)
  ) stored,
  projected_profit numeric(14, 2) generated always as (
    projected_revenue - (
      acquisition_cost + financing_costs
        + (hard_costs + soft_costs) * (1 + contingency_pct / 100)
    )
  ) stored,
  notes text not null default '',
  prepared_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pro_formas_property_idx on pro_formas (org_id, property_id);

-- Comparable sales supporting whether the asking price is reasonable.
create table if not exists comparables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  property_id uuid not null references properties on delete cascade,
  address text not null default '',
  sale_price numeric(14, 2),
  sale_date date,
  lot_size_acres numeric(10, 4),
  building_sqft int,
  distance_miles numeric(6, 2),
  -- Derived so it can never disagree with the price and area it came from.
  price_per_sqft numeric(12, 2) generated always as (
    case when building_sqft > 0 then sale_price / building_sqft end
  ) stored,
  source text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists comparables_property_idx on comparables (org_id, property_id);

-- ---------------------------------------------------------------- offers
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  property_id uuid not null references properties on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  status offer_status not null default 'draft',
  offered_at date not null default current_date,
  expires_at date,
  earnest_money numeric(14, 2),
  due_diligence_days int check (due_diligence_days is null or due_diligence_days >= 0),
  -- Counter-offers chain to what they answer, so the negotiation reads in order.
  supersedes_id uuid references offers on delete set null,
  notes text not null default '',
  submitted_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists offers_property_idx on offers (org_id, property_id, status);

-- ------------------------------------------------- property becomes a project
-- The bridge between the two phases. Nullable because projects predate this
-- schema and not every project starts from an assessed parcel.
alter table projects
  add column if not exists property_id uuid references properties on delete set null;

create index if not exists projects_property_idx on projects (property_id);

-- ---------------------------------------------------------------- RLS
select apply_org_rls('properties');
select apply_org_rls('feasibility_studies');
select apply_org_rls('site_constraints');
select apply_org_rls('pro_formas');
select apply_org_rls('comparables');
select apply_org_rls('offers');
