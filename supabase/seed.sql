-- Arrow Builders — demo seed.
-- Mirrors the dataset the app falls back to when Supabase is not configured,
-- so a fresh database renders the same dashboard and schedule board.
--
-- Run after 0001_init.sql. Sign up a user first, then re-run the profile
-- attachment at the bottom so your account joins the seeded organization.
--
-- Safe to run more than once. Every row carries a fixed id and an `on conflict
-- (id) do nothing`, because the version that did not cost a real account a
-- duplicate of every task, approval and document it had — indistinguishable
-- from its own records, and counted against its plan. A seed file is run twice
-- by definition: once to set up, and again the next time someone is not sure
-- whether the first one worked.

insert into organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'Greenfield Construction', 'greenfield')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- projects
insert into projects (id, org_id, name, city, state, status, completion_pct, budget_spent, budget_total, target_date)
values
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Riverside Apartments',     'Austin',      'TX', 'on_schedule',     68, 2340000, 3450000, '2025-08-22'),
  ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Maple Street Townhomes',   'Round Rock',  'TX', 'behind_schedule', 42, 1150000, 2750000, '2025-10-10'),
  ('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Westgate Retail Center',   'Pflugerville','TX', 'on_schedule',     25,  880000, 3200000, '2025-12-18')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- tasks
insert into tasks (id, org_id, project_id, title, trade, status, starts_at, ends_at, crew_size, overdue, sort_order)
values
  -- unscheduled backlog
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Install Exterior Doors', 'general',    'unscheduled', null, null, 2, false, 0),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Paint – Level 2',        'finishes',   'unscheduled', null, null, 3, false, 1),
  ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Landscape Prep',         'general',    'unscheduled', null, null, 2, false, 2),
  ('33333333-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Plumbing Rough-In',      'plumbing',   'unscheduled', null, null, 2, false, 3),
  ('33333333-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Final Clean',            'finishes',   'unscheduled', null, null, 4, false, 4),
  ('33333333-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Fire Sprinkler Trim',    'plumbing',   'unscheduled', null, null, 3, false, 5),
  ('33333333-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Punch List Walk',        'general',    'unscheduled', null, null, 2, false, 6),
  ('33333333-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Elevator Inspection',    'general',    'unscheduled', null, null, 1, false, 7),
  ('33333333-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Gutters & Downspouts',   'general',    'unscheduled', null, null, 2, false, 8),
  ('33333333-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Panel Board Install',    'electrical', 'unscheduled', null, null, 3, false, 9),
  ('33333333-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Tile – Units 4-8',       'finishes',   'unscheduled', null, null, 4, false, 10),
  ('33333333-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Parking Lot Striping',   'general',    'unscheduled', null, null, 2, false, 11),
  ('33333333-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'HVAC Startup',           'electrical', 'unscheduled', null, null, 3, false, 12),
  -- week of May 12–18 2025
  ('33333333-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Site Prep',          'general',  'done',        '2025-05-12', '2025-05-12', 4, false, 13),
  ('33333333-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Footings',           'concrete', 'done',        '2025-05-12', '2025-05-12', 5, false, 14),
  ('33333333-0000-0000-0000-000000000016', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Framing – Level 1',  'general',  'in_progress', '2025-05-14', '2025-05-14', 6, false, 15),
  ('33333333-0000-0000-0000-000000000017', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Concrete Pour',      'concrete', 'in_progress', '2025-05-15', '2025-05-15', 6, true,  16),
  ('33333333-0000-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Drywall – Level 2',  'finishes', 'scheduled',   '2025-05-15', '2025-05-15', 4, false, 17),
  ('33333333-0000-0000-0000-000000000019', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Window Install',     'general',  'scheduled',   '2025-05-16', '2025-05-16', 4, false, 18),
  ('33333333-0000-0000-0000-000000000020', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Roofing',            'general',  'scheduled',   '2025-05-17', '2025-05-17', 5, false, 19),
  ('33333333-0000-0000-0000-000000000021', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Interior Paint',     'finishes', 'scheduled',   '2025-05-18', '2025-05-18', 4, false, 20)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- milestones
insert into milestones (id, org_id, project_id, title, trade, starts_at, ends_at)
values
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Concrete Foundations', 'concrete', '2025-05-12', '2025-05-16'),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Steel Erection',       'general',  '2025-05-15', '2025-05-22')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- approvals
insert into approvals (id, org_id, project_id, kind, reference, amount, status, submitted_at)
values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'change_order',        'Change Order #12',           18650,  'pending', '2025-05-16T14:10:00Z'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'payment_application', 'Payment Application #4',     76320,  'pending', '2025-05-15T20:40:00Z'),
  ('55555555-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'submittal',           'Submittal: Window Frames',   null,   'pending', '2025-05-14T16:05:00Z'),
  ('55555555-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'rfq',                 'RFQ: Electrical Fixtures',   null,   'pending', '2025-05-13T13:20:00Z'),
  ('55555555-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'rfi',                 'RFI: Slab Edge Detail',      null,   'pending', '2025-05-12T21:00:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- cash flow
insert into cash_flow (org_id, period, inflow, outflow)
values
  ('11111111-1111-1111-1111-111111111111', '2025-05-16', 210000, 148000),
  ('11111111-1111-1111-1111-111111111111', '2025-05-30', 168000, 132000),
  ('11111111-1111-1111-1111-111111111111', '2025-06-13', 254000, 196000),
  ('11111111-1111-1111-1111-111111111111', '2025-06-27', 142000, 178000),
  ('11111111-1111-1111-1111-111111111111', '2025-07-11', 288000, 164000),
  ('11111111-1111-1111-1111-111111111111', '2025-07-25', 196000, 210000),
  ('11111111-1111-1111-1111-111111111111', '2025-08-08', 232000, 158000)
on conflict (org_id, period) do nothing;

-- ---------------------------------------------------------------- documents
insert into documents (id, org_id, project_id, name, category, size_kb, uploaded_by, uploaded_at)
values
  ('66666666-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Riverside – Structural Set Rev C.pdf', 'Drawings',      18420, 'Marcus Webb',  '2025-05-15T19:00:00Z'),
  ('66666666-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Foundation Pour Log 05-15.xlsx',       'Field Reports',   240, 'Alicia Reyes', '2025-05-15T23:30:00Z'),
  ('66666666-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Window Frame Submittal.pdf',           'Submittals',     6180, 'Priya Nair',   '2025-05-14T16:05:00Z'),
  ('66666666-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Change Order 12 – Signed.pdf',         'Contracts',       890, 'Jordan Mills', '2025-05-16T14:10:00Z'),
  ('66666666-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Site Safety Plan 2025.docx',           'Safety',         1320, 'Sofia Ibarra', '2025-05-09T13:00:00Z'),
  ('66666666-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Steel Erection Sequence.pdf',          'Drawings',       9640, 'Marcus Webb',  '2025-05-12T15:45:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- your profile
-- Profiles are created automatically on sign-up. Attach every existing user to
-- the seeded organization so they can see the rows above.
update profiles
set org_id = '11111111-1111-1111-1111-111111111111',
    role = coalesce(nullif(role, 'Crew'), 'Development Manager')
where org_id is null;
