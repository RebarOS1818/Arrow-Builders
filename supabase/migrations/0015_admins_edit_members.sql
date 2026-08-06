-- Let an organization's admins edit its people.
--
-- Until now a profile could only be updated by the person it belongs to
-- (`using (id = auth.uid())` in 0001). That is right for a self-serve field
-- like "on site today" and wrong for everything an admin actually needs: a
-- name misspelled at sign-up, a trade left blank, a job title that changed.
-- There was no way to fix any of it except the SQL editor.
--
-- What this does NOT open up:
--
--   is_admin — still refused by the trigger in 0004 and still absent from the
--   column grant below. Promoting someone stays a deliberate act performed with
--   the service role, not something an edit form can do by accident.
--
--   org_id — still refused by the trigger in 0002, which is what stops a
--   profile being moved between tenants.
--
--   Anyone outside the caller's own organization. The policy compares against
--   current_org_id() on both sides.
--
-- Safe to run more than once.

drop policy if exists "org admins update member profiles" on profiles;

create policy "org admins update member profiles"
  on profiles for update to authenticated
  using (
    org_id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    org_id = current_org_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- `role` is the job title shown on the team card — "Superintendent", "Foreman".
-- It was left out of 0004's grant along with is_admin, but the two are not
-- alike: is_admin decides what someone may do, role only says what they are
-- called. Leaving it ungranted meant a typo at sign-up was permanent.
--
-- Re-granted as a whole list because a bare `grant update (role)` would not
-- restore the columns 0004 already granted.
revoke update on profiles from authenticated;
grant update (full_name, initials, avatar_url, on_site_today, trade, role)
  on profiles to authenticated;
