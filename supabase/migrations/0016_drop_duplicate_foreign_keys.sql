-- Drop foreign keys that exist twice over.
--
-- Several tables carried two identical foreign keys to the same parent —
-- approvals, tasks, documents and milestones all had two copies of
-- `project_id -> projects`. Postgres permits this: constraints are identified by
-- name, and nothing stops a second one describing exactly the same rule.
--
-- It is not harmless. PostgREST reads foreign keys to work out how to embed a
-- parent, and with two relationships between the same pair of tables it joined
-- on both — so `select *, project:projects(id, name)` returned every row twice.
-- Every list in the app was doubled, and so was every figure computed from one:
-- the approvals page read "$152,640 awaiting sign-off" against a real total of
-- $76,320. A duplicated row is obvious enough to notice on a list. A doubled
-- amount of money is not, because there is nothing beside it to disagree with.
--
-- The oldest constraint of each set is kept. Where duplicates disagree — one
-- `on delete cascade`, one `no action` — the original from `create table` is the
-- one that was designed, and the later copy is the accident.
--
-- Safe to run more than once: with no duplicates left it does nothing.

do $$
declare
  dup record;
  i int;
begin
  for dup in
    select conrelid,
           array_agg(oid order by oid)     as oids,
           array_agg(conname order by oid) as names
      from pg_constraint
     where contype = 'f'
       and connamespace = 'public'::regnamespace
     group by conrelid, conkey, confrelid, confkey
    having count(*) > 1
  loop
    -- From the second onwards: the first is the keeper.
    for i in 2 .. array_length(dup.oids, 1) loop
      execute format('alter table %s drop constraint %I', dup.conrelid::regclass, dup.names[i]);
      raise notice 'dropped duplicate foreign key %s on %s', dup.names[i], dup.conrelid::regclass;
    end loop;
  end loop;
end $$;

-- PostgREST caches the schema, and it is the schema it just stopped being wrong
-- about. Without this the embeds keep doubling until something else reloads it.
notify pgrst, 'reload schema';
