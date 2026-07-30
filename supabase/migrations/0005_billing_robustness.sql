-- Robustness fixes for the billing schema, from review of 0003.
--
--   1. subscription_status did not cover every status Stripe can send. Writing
--      an unlisted value raises invalid_input_value, the webhook 500s, and
--      Stripe retries forever while the stored billing state goes stale.
--   2. enforce_seat_limit() read the seat count without serialising against
--      concurrent inserts, so two admins invited into the last seat could both
--      pass the check and land the org over its limit.

-- ============================================== 1. full Stripe status coverage
-- Stripe's documented set is: incomplete, incomplete_expired, trialing, active,
-- past_due, canceled, unpaid, paused. 'none' is ours, for "never subscribed".
alter type subscription_status add value if not exists 'unpaid';
alter type subscription_status add value if not exists 'paused';
alter type subscription_status add value if not exists 'incomplete_expired';

-- ==================================================== 2. serialise seat checks
-- Locking the organization row makes concurrent invite inserts for the same org
-- queue behind each other. The counts are then taken with inline queries rather
-- than via the STABLE helpers: inside this VOLATILE trigger each statement gets
-- a fresh snapshot, so the second transaction sees the row the first committed.
create or replace function enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_seats int;
  used_seats int;
begin
  select seat_limit into limit_seats
    from organizations
   where id = new.org_id
     for update;

  if limit_seats is null then
    raise exception 'organization % does not exist', new.org_id
      using errcode = 'foreign_key_violation';
  end if;

  select (select count(*) from profiles where org_id = new.org_id)
       + (select count(*) from org_invites
          where org_id = new.org_id
            and accepted_at is null
            and revoked_at is null)
    into used_seats;

  if used_seats >= limit_seats then
    raise exception 'seat limit reached for this organization'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
