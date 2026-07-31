-- Flat monthly fee for a bundle of users, replacing per-seat pricing.
--
-- The Stripe subscription quantity is now always 1, so seat_limit can no longer
-- be derived from it — the webhook reads the allowance from the Price's
-- included_seats metadata instead. Nothing here depends on Stripe; this
-- migration only renames the price column and moves the default ceiling.
--
-- Written to be safe to run more than once. These migrations get pasted into
-- the Supabase SQL editor by hand, often on a phone, and anything that can only
-- be applied once eventually gets applied twice — a partial paste, a lost
-- scroll position, an uncertain "did that go through?". A bare ALTER ... RENAME
-- fails the second time with `column "price_per_seat_cents" does not exist`,
-- which reads as a broken schema rather than one that is already correct.

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'organizations'
       and column_name = 'price_per_seat_cents'
  ) and not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'organizations'
       and column_name = 'price_cents'
  ) then
    alter table organizations rename column price_per_seat_cents to price_cents;
  end if;
end $$;

comment on column organizations.price_cents is
  'Flat monthly fee for the whole organization, not a per-user rate. Written by the Stripe webhook from the Price, so the app never displays a figure the customer is not actually charged.';

comment on column organizations.seat_limit is
  'Users included in the plan. Set from the Stripe Price metadata by the webhook.';

alter table organizations
  alter column price_cents set default 0;

alter table organizations
  alter column seat_limit set default 3;

update organizations
   set seat_limit = 50
 where stripe_subscription_id is not null
   and seat_limit < 50;
