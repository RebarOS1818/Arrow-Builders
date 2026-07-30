-- Flat monthly fee for a bundle of users, replacing per-seat pricing.
--
-- The Stripe subscription quantity is now always 1, so seat_limit can no longer
-- be derived from it — the webhook reads the allowance from the Price's
-- included_seats metadata instead. Nothing here depends on Stripe; this
-- migration only renames the price column and moves the default ceiling.

alter table organizations
  rename column price_per_seat_cents to price_cents;

comment on column organizations.price_cents is
  'Flat monthly fee for the whole organization, not a per-user rate. Written by the Stripe webhook from the Price, so the app never displays a figure the customer is not actually charged.';

-- 2900 was the old per-seat rate and would be a wrong flat fee. Zero reads as
-- "not yet known", which is honest until the webhook records the real amount.
alter table organizations
  alter column price_cents set default 0;

comment on column organizations.seat_limit is
  'Users included in the plan. Set from the Stripe Price metadata by the webhook.';

-- New organizations start on the free ceiling; a paid plan raises it.
alter table organizations
  alter column seat_limit set default 3;

-- Existing paid organizations were given a seat_limit equal to their Stripe
-- quantity, which under flat-fee pricing would be the number of users they
-- happened to have at checkout. Lift those to the standard bundle. Rows still
-- on the old free default are left alone.
update organizations
   set seat_limit = 50
 where stripe_subscription_id is not null
   and seat_limit < 50;
