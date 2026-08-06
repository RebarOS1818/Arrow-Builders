-- The four links a building carries in SmartSuite that it did not carry here.
--
-- Safe to run more than once.

-- ------------------------------------------------------- the parcel it sits on
-- A building already reaches a parcel through its project, but only when the
-- project has one — and a project assembled from several parcels has no single
-- answer. Recording it on the building is the only place it is unambiguous.
alter table buildings
  add column if not exists property_id uuid references properties on delete set null;

create index if not exists buildings_property_idx on buildings (org_id, property_id);

-- ------------------------------------------------------------ who is running it
-- `on delete set null` rather than cascade: somebody leaving the company is not
-- a reason to delete the building they were managing.
alter table buildings
  add column if not exists manager_id uuid references profiles on delete set null;

create index if not exists buildings_manager_idx on buildings (org_id, manager_id);

-- ------------------------------------------- a building within its own project
--
-- Tasks and documents can now name a building, and a building belongs to a
-- project. Nothing must be able to attach a task on project A to a building on
-- project B.
--
-- A composite foreign key rather than a trigger: the pair (building_id,
-- project_id) has to match a row in buildings, so the database refuses a
-- mismatch by itself and there is no function to keep in step. It needs a
-- unique constraint on the pair it references, which is redundant with the
-- primary key but is what Postgres requires to point at it.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buildings_id_project_key'
  ) then
    alter table buildings add constraint buildings_id_project_key unique (id, project_id);
  end if;
end $$;

alter table tasks add column if not exists building_id uuid;
alter table documents add column if not exists building_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_building_fkey') then
    alter table tasks add constraint tasks_building_fkey
      foreign key (building_id, project_id) references buildings (id, project_id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'documents_building_fkey') then
    alter table documents add constraint documents_building_fkey
      foreign key (building_id, project_id) references buildings (id, project_id)
      on delete cascade;
  end if;
end $$;

create index if not exists tasks_building_idx on tasks (org_id, building_id);
create index if not exists documents_building_idx on documents (org_id, building_id);

-- ------------------------------------------------------- documents, revisited
--
-- 0014 said a document belongs to exactly one of a project or a parcel. A
-- building is a third owner, but not a fourth case: a building document is a
-- project document that also names which building, so `project_id` stays set
-- and the composite key above is what keeps the two honest.
--
-- The constraint is unchanged and still counts project and property only —
-- stated here because it is the sort of thing that looks like an oversight
-- when read later.

comment on column documents.building_id is
  'Optional narrowing of a project document to one building. Never set without '
  'project_id — the composite foreign key to buildings (id, project_id) refuses '
  'it, which is also what stops a document naming a building on another project.';

comment on column tasks.building_id is
  'Optional narrowing of a project task to one building, with the same '
  'composite foreign key keeping the building inside the task''s own project.';

notify pgrst, 'reload schema';
