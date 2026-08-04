-- Sola Payments (Cardknox gateway) alongside Stripe.
--
-- Sola has no hosted checkout and no product catalogue: a subscription is a
-- customer, a stored payment method, and a recurring *schedule*, each with its
-- own identifier. Three columns rather than Stripe's two, because there is no
-- single object that stands for "the subscription" — cancelling means disabling
-- the schedule, while the customer and payment method outlive it and are what
-- let someone resubscribe without re-entering a card.
--
-- The Stripe columns are deliberately left in place. Both processors can be
-- configured at once during the switch-over; the app prefers Sola when it is
-- configured, and the Stripe columns keep any existing subscription readable
-- until it is migrated. Idempotent, so re-running is safe.

alter table organizations
  add column if not exists sola_customer_id text,
  add column if not exists sola_payment_method_id text,
  add column if not exists sola_schedule_id text;

comment on column organizations.sola_customer_id is
  'Sola/Cardknox CustomerId. Survives cancellation so a card can be reused.';
comment on column organizations.sola_payment_method_id is
  'Sola/Cardknox PaymentMethodId the schedule charges.';
comment on column organizations.sola_schedule_id is
  'Sola/Cardknox ScheduleId. Null means no active recurring billing.';

-- One organization per Sola customer, and per schedule. Without this a repeated
-- webhook or a double-submitted payment form could attach the same schedule to
-- two organizations, and the webhook's lookup-by-schedule would update whichever
-- row Postgres happened to return first.
create unique index if not exists organizations_sola_customer_id_key
  on organizations (sola_customer_id)
  where sola_customer_id is not null;

create unique index if not exists organizations_sola_schedule_id_key
  on organizations (sola_schedule_id)
  where sola_schedule_id is not null;

-- 0004 revoked table-wide UPDATE on organizations and re-granted it per column
-- (name, slug only). New columns inherit that: authenticated cannot write them,
-- so an admin cannot point their org at someone else's schedule or clear their
-- own to stop being billed. Only the service-role webhook writes these. Asserted
-- rather than assumed, because a future `grant update on organizations` would
-- silently undo it.
do $$
begin
  if exists (
    select 1
      from information_schema.column_privileges
     where table_schema = 'public'
       and table_name = 'organizations'
       and column_name like 'sola\_%'
       and privilege_type = 'UPDATE'
       and grantee = 'authenticated'
  ) then
    raise exception
      'authenticated can UPDATE organizations.sola_* — revoke it; only the service role may write billing identifiers';
  end if;
end
$$;
