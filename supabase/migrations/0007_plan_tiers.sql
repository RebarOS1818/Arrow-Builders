-- Three plans: starter, premium, enterprise.
--
-- The tiers themselves live in src/lib/stripe/tiers.ts and are priced in
-- Stripe; nothing about them is stored here beyond which one an organization is
-- on. That is deliberate — adding a tier or repricing one should not need a
-- migration.
--
-- Before this change the webhook recorded every paid subscription as 'team',
-- which now matches no tier: the billing page would show "Team Plan" and none
-- of the three cards would be marked as current. Existing rows are moved to the
-- entry tier; the webhook derives the real one from the Stripe Price on the
-- next subscription event.
--
-- Safe to run more than once.

update organizations
   set plan = 'starter'
 where plan = 'team';

comment on column organizations.plan is
  'Tier key: starter, premium or enterprise. Set by the Stripe webhook from the Price that was actually bought, so it can never disagree with the invoice.';
