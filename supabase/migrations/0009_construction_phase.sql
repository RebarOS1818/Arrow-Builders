-- Construction phase: what gets built, who builds it, and what it ends up
-- costing once reality intervenes.
--
-- The spine is bid package → quote → contract → change order. Each step is a
-- separate table because each is a distinct commitment: a quote is what someone
-- offered, a contract is what was agreed, and a change order is what changed
-- afterwards. Collapsing them loses the history that disputes turn on.
--
-- Safe to run more than once.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'building_type') then
    create type building_type as enum (
      'single_family', 'townhome', 'multifamily', 'commercial', 'mixed_use', 'amenity'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'build_status') then
    create type build_status as enum (
      'planned', 'permitting', 'under_construction', 'complete', 'on_hold'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'unit_status') then
    create type unit_status as enum (
      'planned', 'under_construction', 'complete', 'reserved', 'sold', 'leased'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bid_status') then
    create type bid_status as enum ('draft', 'open', 'closed', 'awarded', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type quote_status as enum (
      'received', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type contract_status as enum (
      'draft', 'sent', 'executed', 'in_progress', 'complete', 'terminated'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'change_order_status') then
    create type change_order_status as enum (
      'draft', 'submitted', 'approved', 'rejected', 'void'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'change_order_reason') then
    create type change_order_reason as enum (
      'owner_request', 'unforeseen_condition', 'design_error', 'code_requirement',
      'weather', 'material_availability', 'other'
    );
  end if;
end $$;

-- ---------------------------------------------------------------- buildings
create table if not exists buildings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  name text not null,
  building_type building_type not null default 'single_family',
  status build_status not null default 'planned',
  floors int not null default 1 check (floors > 0),
  gross_sqft int check (gross_sqft is null or gross_sqft >= 0),
  permit_number text,
  permit_issued_at date,
  started_at date,
  completed_at date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists buildings_project_idx on buildings (org_id, project_id);

-- ---------------------------------------------------------------- units
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  building_id uuid not null references buildings on delete cascade,
  -- Denormalised from the building so unit queries do not have to join through
  -- it to respect the project scope. Kept honest by a trigger below.
  project_id uuid not null references projects on delete cascade,
  unit_number text not null,
  unit_type text not null default '',
  status unit_status not null default 'planned',
  floor int,
  bedrooms numeric(3, 1) check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(3, 1) check (bathrooms is null or bathrooms >= 0),
  sqft int check (sqft is null or sqft >= 0),
  list_price numeric(14, 2),
  sold_price numeric(14, 2),
  closed_at date,
  created_at timestamptz not null default now()
);

create unique index if not exists units_building_number_idx on units (building_id, unit_number);
create index if not exists units_project_status_idx on units (org_id, project_id, status);

-- A unit must belong to the same project as its building. Enforced rather than
-- assumed: the denormalised column is only useful if it cannot lie.
create or replace function unit_inherits_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_project uuid;
  parent_org uuid;
begin
  select project_id, org_id into parent_project, parent_org
    from buildings where id = new.building_id;

  if parent_project is null then
    raise exception 'building % does not exist', new.building_id;
  end if;

  new.project_id := parent_project;
  new.org_id := parent_org;
  return new;
end;
$$;

drop trigger if exists units_inherit_project on units;
create trigger units_inherit_project
  before insert or update of building_id on units
  for each row execute function unit_inherits_project();

-- ------------------------------------------------------- subcontractors
create table if not exists subcontractors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  company_name text not null,
  trade trade not null default 'general',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  license_number text,
  -- Expiry rather than a boolean: "insured" is only true until a date, and
  -- storing the date is what lets the app warn before it lapses.
  insurance_expires_at date,
  license_expires_at date,
  is_approved boolean not null default false,
  rating numeric(2, 1) check (rating is null or (rating >= 0 and rating <= 5)),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists subcontractors_org_trade_idx on subcontractors (org_id, trade);
create unique index if not exists subcontractors_org_name_idx
  on subcontractors (org_id, lower(company_name));

-- ------------------------------------------------------- bidding
create table if not exists bid_packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  name text not null,
  trade trade not null default 'general',
  scope_description text not null default '',
  budget numeric(14, 2),
  status bid_status not null default 'draft',
  issued_at date,
  due_at date,
  created_at timestamptz not null default now()
);

create index if not exists bid_packages_project_idx on bid_packages (org_id, project_id, status);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  bid_package_id uuid not null references bid_packages on delete cascade,
  subcontractor_id uuid not null references subcontractors on delete restrict,
  amount numeric(14, 2) not null check (amount >= 0),
  status quote_status not null default 'received',
  -- What the number does and does not cover; the usual source of an apples-to-
  -- oranges bid comparison.
  inclusions text not null default '',
  exclusions text not null default '',
  duration_days int check (duration_days is null or duration_days >= 0),
  submitted_at date not null default current_date,
  valid_until date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- One live quote per sub per package. A revised bid replaces rather than
-- duplicates, so a comparison never shows the same firm twice.
create unique index if not exists quotes_package_sub_idx
  on quotes (bid_package_id, subcontractor_id);
create index if not exists quotes_org_status_idx on quotes (org_id, status);

-- ------------------------------------------------------- contracts
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  project_id uuid not null references projects on delete cascade,
  subcontractor_id uuid not null references subcontractors on delete restrict,
  -- The winning quote, kept so the agreed figure can always be traced back to
  -- what was actually bid.
  quote_id uuid references quotes on delete set null,
  contract_number text not null,
  title text not null,
  trade trade not null default 'general',
  original_amount numeric(14, 2) not null check (original_amount >= 0),
  status contract_status not null default 'draft',
  retainage_pct numeric(5, 2) not null default 0
    check (retainage_pct >= 0 and retainage_pct <= 100),
  starts_on date,
  ends_on date,
  executed_at date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists contracts_org_number_idx on contracts (org_id, contract_number);
create index if not exists contracts_project_idx on contracts (org_id, project_id, status);

-- ------------------------------------------------------- change orders
create table if not exists change_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  contract_id uuid not null references contracts on delete cascade,
  -- Denormalised for project-level reporting without a join; kept true by the
  -- trigger below.
  project_id uuid not null references projects on delete cascade,
  number int not null,
  description text not null,
  reason change_order_reason not null default 'owner_request',
  -- Deliberately unconstrained in sign: a credit back to the owner is a
  -- negative change order, and refusing them would force a fiction.
  amount numeric(14, 2) not null,
  days_impact int not null default 0,
  status change_order_status not null default 'draft',
  submitted_at date,
  decided_at date,
  decided_by uuid references profiles on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint decision_requires_date
    check (status not in ('approved', 'rejected') or decided_at is not null)
);

create unique index if not exists change_orders_contract_number_idx
  on change_orders (contract_id, number);
create index if not exists change_orders_project_idx
  on change_orders (org_id, project_id, status);

create or replace function change_order_inherits_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_project uuid;
  parent_org uuid;
begin
  select project_id, org_id into parent_project, parent_org
    from contracts where id = new.contract_id;

  if parent_project is null then
    raise exception 'contract % does not exist', new.contract_id;
  end if;

  new.project_id := parent_project;
  new.org_id := parent_org;
  return new;
end;
$$;

drop trigger if exists change_orders_inherit_project on change_orders;
create trigger change_orders_inherit_project
  before insert or update of contract_id on change_orders
  for each row execute function change_order_inherits_project();

-- ------------------------------------------------------- payment applications
-- Progress billing against a contract. Retainage is withheld until the end, so
-- the amount due is never simply the amount completed.
create table if not exists payment_applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  contract_id uuid not null references contracts on delete cascade,
  number int not null,
  period_end date not null,
  work_completed numeric(14, 2) not null default 0 check (work_completed >= 0),
  materials_stored numeric(14, 2) not null default 0 check (materials_stored >= 0),
  retainage_held numeric(14, 2) not null default 0 check (retainage_held >= 0),
  previously_paid numeric(14, 2) not null default 0 check (previously_paid >= 0),
  amount_due numeric(14, 2) generated always as (
    work_completed + materials_stored - retainage_held - previously_paid
  ) stored,
  status approval_status not null default 'pending',
  submitted_at date,
  paid_at date,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_applications_contract_number_idx
  on payment_applications (contract_id, number);
create index if not exists payment_applications_org_idx
  on payment_applications (org_id, status);

-- ------------------------------------------------------- contract totals
-- The number people actually ask for: what a contract is worth now, given the
-- change orders that have been approved. A view rather than a stored column so
-- it cannot fall out of step with the rows it summarises.
create or replace view contract_totals as
  select
    c.id as contract_id,
    c.org_id,
    c.project_id,
    c.contract_number,
    c.original_amount,
    coalesce(sum(co.amount) filter (where co.status = 'approved'), 0) as approved_changes,
    coalesce(sum(co.amount) filter (where co.status = 'submitted'), 0) as pending_changes,
    c.original_amount
      + coalesce(sum(co.amount) filter (where co.status = 'approved'), 0) as current_amount,
    coalesce(sum(co.days_impact) filter (where co.status = 'approved'), 0) as approved_days_impact
  from contracts c
  left join change_orders co on co.contract_id = c.id
  group by c.id;

-- The view runs as the caller, so the underlying tables' policies still apply
-- and it cannot be used to read another organization's contracts.
alter view contract_totals set (security_invoker = on);

-- ---------------------------------------------------------------- RLS
select apply_org_rls('buildings');
select apply_org_rls('units');
select apply_org_rls('subcontractors');
select apply_org_rls('bid_packages');
select apply_org_rls('quotes');
select apply_org_rls('contracts');
select apply_org_rls('change_orders');
select apply_org_rls('payment_applications');
