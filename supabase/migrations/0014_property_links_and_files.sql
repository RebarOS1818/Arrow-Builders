-- What a parcel is attached to, and what is attached to a parcel.
--
-- Two gaps this closes.
--
-- First: nothing recorded which parcel a project was built on. The development
-- work — studies, constraints, pro formas, comps, the offer that won it — lived
-- on the property, and the moment it became a project that history was orphaned.
-- You could not stand on a project and ask what the ground under it cost, and
-- you could not stand on a parcel and ask what came of it. `projects.property_id`
-- is the join that makes both questions answerable, and through it a parcel also
-- reaches the buildings, units, tasks and contracts that hang off its project.
--
-- Second: documents could only belong to a project. The drawings that matter
-- most during acquisition — the survey, the plot plan, the site plan, the early
-- sketch — all exist before a project does. They were being uploaded against a
-- project that had not been created yet, or not uploaded at all.
--
-- Safe to run more than once.

-- ------------------------------------------------- the parcel a project is on
alter table projects
  add column if not exists property_id uuid references properties on delete set null;

comment on column projects.property_id is
  'The parcel this project was built on. Null for projects that predate the '
  'development phase, or were entered without one — deliberately nullable so a '
  'project is never blocked on backfilling its history.';

create index if not exists projects_property_idx on projects (org_id, property_id);

-- ------------------------------------------------------- documents on parcels
alter table documents
  add column if not exists property_id uuid references properties on delete cascade;

-- Was `not null`. A document now belongs to exactly one of the two, which the
-- check below enforces — nullable alone would allow a row belonging to neither.
alter table documents alter column project_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_one_owner'
  ) then
    alter table documents add constraint documents_one_owner
      check (num_nonnulls(project_id, property_id) = 1);
  end if;
end $$;

create index if not exists documents_property_idx on documents (org_id, property_id);

-- ------------------------------------------------------------- named drawings
--
-- The four drawings a parcel is assessed from are categories rather than
-- columns. Four nullable storage-path columns would duplicate everything the
-- documents table already does — signed downloads, size, who uploaded it, the
-- storage policies — and would cap each one at a single file, which is wrong
-- the first time a survey arrives as a revision.
--
-- Nothing here constrains the values; `category` stays free text so a new kind
-- of drawing does not need a migration. This is a comment because the list
-- lives in the application, and the application is where it belongs.
comment on column documents.category is
  'Free text. The application offers a fixed list — General, Drawings, Permits, '
  'Contracts, Submittals, Photos, Safety, Invoices for projects; Survey, Plot '
  'Plan, Site Plan, Sketch for parcels — but the column does not enforce it.';
