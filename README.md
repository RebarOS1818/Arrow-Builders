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
