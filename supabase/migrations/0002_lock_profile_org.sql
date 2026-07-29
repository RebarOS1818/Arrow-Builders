-- Stop end users from moving themselves between organizations.
--
-- The "users update own profile" policy in 0001 only revalidates
-- `id = auth.uid()`, so an authenticated user could set their own
-- `profiles.org_id` to any organization UUID. Because `current_org_id()` reads
-- that column, every org-scoped policy would then trust the new value and grant
-- access to another tenant's projects, tasks, approvals and documents.
--
-- RLS `with check` cannot compare against the row's previous value, so the
-- invariant is enforced with a trigger instead. `auth.uid()` is null for
-- service-role and SQL-editor connections, which keeps administrative
-- reassignment (including seed.sql) working.

create or replace function prevent_profile_org_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.org_id is distinct from old.org_id then
    raise exception 'org_id cannot be changed by the profile owner';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_org on profiles;

create trigger profiles_lock_org
  before update on profiles
  for each row execute function prevent_profile_org_change();
