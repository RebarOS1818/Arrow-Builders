-- The acquisition pipeline as it is actually run.
--
-- The board had five statuses that stopped at "acquired". The real pipeline
-- runs nine stages and does not stop there — it carries a parcel through
-- development, listing and sale, which is most of the value of tracking it at
-- all. A parcel that goes dark the moment it is bought is a parcel nobody can
-- report on.
--
-- Three existing values are renamed rather than replaced, so every row keeps its
-- place. `passed` is kept: walking away is a real outcome and the pipeline it
-- came from has nowhere to record one.

-- Renames first. These rewrite the label, not the rows, so nothing has to be
-- migrated afterwards.
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'property_status' and e.enumlabel = 'prospect'
  ) then
    alter type property_status rename value 'prospect' to 'prospecting';
  end if;

  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'property_status' and e.enumlabel = 'under_review'
  ) then
    alter type property_status rename value 'under_review' to 'pre_planning';
  end if;

  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'property_status' and e.enumlabel = 'acquired'
  ) then
    alter type property_status rename value 'acquired' to 'owned_predevelopment';
  end if;
end
$$;

-- The stages the pipeline gained. Positioned explicitly: an enum's declared
-- order is what `order by status` sorts on, and a stage appended to the end
-- would sort after "sold out" no matter where it belongs in the process.
alter type property_status add value if not exists 'planning' after 'pre_planning';
alter type property_status add value if not exists 'in_development' after 'owned_predevelopment';
alter type property_status add value if not exists 'units_listed' after 'in_development';
alter type property_status add value if not exists 'partially_sold' after 'units_listed';
alter type property_status add value if not exists 'sold_out' after 'partially_sold';

-- The default is spelled differently now; without this an insert that omits
-- status fails against a value the type no longer has.
alter table properties alter column status set default 'prospecting';

-- ---------------------------------------------------------------- new fields
--
-- lot size is captured in square feet as well as acres because a parcel is
-- advertised in whichever unit the listing used, and converting on entry loses
-- the figure that was actually quoted. `lot_size_sqft` is the number as given;
-- acres stays the number the rest of the app reports on.
alter table properties
  add column if not exists property_type text,
  add column if not exists lot_size_sqft numeric(12, 2) check (lot_size_sqft is null or lot_size_sqft >= 0),
  add column if not exists total_units_planned int check (total_units_planned is null or total_units_planned >= 0),
  add column if not exists acquisition_date date,
  add column if not exists hard_cost_budget numeric(14, 2) check (hard_cost_budget is null or hard_cost_budget >= 0),
  add column if not exists broker text,
  add column if not exists owner_name text,
  add column if not exists architect text;

comment on column properties.lot_size_sqft is
  'Lot size as quoted in square feet. Independent of lot_size_acres; neither is derived from the other.';
comment on column properties.owner_name is
  'Named owner_name rather than owner: "owner" is reserved in Postgres and reads as ownership of the row.';
comment on column properties.hard_cost_budget is
  'Budgeted construction cost. Distinct from asking_price, which is acquisition.';
