# Arrow Builders

Project, schedule and cost control for construction developers — a Next.js app
backed by Supabase and deployed on Vercel.

## What's in it

| Route | What it does |
| --- | --- |
| `/` | Dashboard: revenue/projects/tasks/team tiles, active project cards, today-on-site timeline, 90-day cash flow, approvals inbox |
| `/schedule` | Tasks & Schedule with three views — Calendar (drag unscheduled tasks onto a day), Board (status kanban), Timeline (gantt by project) |
| `/projects`, `/projects/[id]` | Portfolio grid and per-project detail: budget, milestones, tasks, approvals, documents |
| `/tasks` | Filterable task table across all projects |
| `/documents` | Document register filtered by project and category |
| `/teams` | Crew roster with trade and on-site status |
| `/reports` | Budget vs. spend, task status mix, completion by project, cash flow |
| `/approvals` | Pending change orders, pay apps, submittals, RFQs and RFIs |
| `/login`, `/settings` | Supabase email/password auth and account settings |

## Running it

```bash
npm install
npm run dev
```

The app boots on a **bundled demo dataset**, so it renders fully before any
database exists. Everything you see is real UI against real query paths — only
the source of the rows changes once Supabase is configured.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the URL and anon key from
   **Project Settings → API**.
3. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates the
   schema, a `current_org_id()` helper, a sign-up trigger that provisions
   profiles, and row level security on every table.
4. Optionally run `supabase/seed.sql` for the demo portfolio.
5. For billing, run `supabase/migrations/0003_billing_seats.sql`,
   `0004_harden_billing.sql`, `0005_billing_robustness.sql` then
   `0006_flat_fee.sql`. `supabase/setup/billing-bundle.sql` is those four
   concatenated with comments stripped — a convenience for pasting into the SQL
   editor in one go, generated from the migrations, which stay the source of
   truth. Regenerate it if you change either migration.
5. Sign up at `/login`, then re-run the last statement of `seed.sql` to attach
   your new profile to the seeded organization.

With both env vars present the app switches to the database automatically: reads
go through Supabase, drag-to-schedule persists, and unauthenticated requests are
redirected to `/login` by `src/proxy.ts`.

### Data model

`organizations` → `profiles`, `projects` → `tasks`, `milestones`,
`schedule_events`, `approvals`, `cash_flow`, `documents`. Every table carries an
`org_id`, and RLS restricts rows to the organization on the signed-in user's
profile, so a single database serves multiple developers safely.

## Invite emails

Invites always produce a copyable redemption link. If `SUPABASE_SERVICE_ROLE_KEY`
is set, the link is also emailed through Supabase Auth's admin invite endpoint,
which uses the SMTP provider configured under **Project Settings → Auth → SMTP
Settings** — so mail credentials live in Supabase rather than in this app.

Supabase's built-in sender is rate limited and intended for development; wire up
a real provider before relying on delivery. Add the app's domain under
**Authentication → URL Configuration → Redirect URLs** so the invite link is
allowed to land on `/invite/<token>`.

Delivery is attempted only after the invite row exists, so a mail failure never
costs the invite. The form reports what happened and always shows the link.

## Billing

Three plans — **Starter**, **Premium** and **Enterprise** — each a flat monthly
fee for a bundle of users. The Stripe subscription quantity is always 1, so
adding or removing people never changes the invoice.

Tiers are declared in `src/lib/stripe/tiers.ts` but priced in Stripe. Both the
amount and the user allowance are read from the Price at runtime, so repricing a
plan or changing its allowance is a dashboard edit, not a deploy:

| Plan | Price ID | Bought how |
| --- | --- | --- |
| Starter | `STRIPE_PRICE_ID_STARTER` | Stripe Checkout |
| Premium | `STRIPE_PRICE_ID_PREMIUM` | Stripe Checkout |
| Enterprise | none | Contact sales |

Enterprise has no Price, which is what makes it unbuyable online — the card
shows a mailto link instead, and you set the organization's plan and seat limit
yourself once terms are agreed. A negotiated Price created directly in the
dashboard is recorded as enterprise, since an unrecognised Price is almost
always exactly that.

The allowance comes from the Price's `included_seats` metadata, falling back to
the tier's `includedSeats`. It is deliberately **not** read from the
subscription quantity: under a flat fee that is always 1, which would drop the
ceiling to a single user the moment the subscription started.

Which plan an organization is on is derived from the Price on the subscription,
never from what the browser asked for, so the recorded plan cannot disagree with
the invoice.

Subscribing and switching plan are separate endpoints (`/api/stripe/checkout`
and `/api/stripe/change-plan`) because they are different Stripe operations —
sending an existing subscriber through Checkout again leaves them with two
subscriptions and two invoices.

Inviting past the limit is refused by a database trigger, so access can never
exceed what is billed. A pending invite holds a place until accepted or revoked.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) — the Next.js preset is
   detected automatically.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under
   **Settings → Environment Variables** for Production, Preview and Development.
4. Deploy. In Supabase, add your Vercel domain under **Authentication → URL
   Configuration** so email links resolve correctly.

Leaving the env vars out still deploys — you get the demo dataset, which is handy
for preview links.

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · React 19 ·
TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS) · Recharts ·
lucide-react.
