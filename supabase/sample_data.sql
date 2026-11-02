-- =============================================================================
-- PSTO Cagayan — sample data (same 12 firms + 8 map pins as the app's demo mode)
-- Run AFTER setup.sql: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once: rows are skipped if their SPIN no. already exists.
-- =============================================================================

-- ── Firms ───────────────────────────────────────────────────────────────────
insert into public.firm
  (year, firm, beneficiary, project_title, amount_assisted, spin_no, sector, district,
   employee, proposal, equipment, trainings, project_status, status, created_at)
select v.*
from (values
  ('2026', 'Cagayan Cassava Foods',       'Maria Santos',     'Cassava chips upgrade',        '850000',  'SPIN-2026-001', 'Food Processing',        '1', '12', null::text, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Regular Due',        'Updated',            timestamptz '2026-01-06'),
  ('2026', 'Aparri Fishers Cooperative',  'Jose Ramirez',     'Fish drying and packaging',    '1200000', 'SPIN-2026-002', 'Aquaculture',            '3', '28', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Fully Paid Projects', 'Fully Paid',        timestamptz '2026-02-07'),
  ('2026', 'Solana Rice Mill',            'Ana Dela Cruz',    'Rice milling line',            '2400000', 'SPIN-2026-003', 'Agriculture',            '2', '19', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Past Due',           'Due and Demandable', timestamptz '2026-02-08'),
  ('2026', 'Tuguegarao Furniture Works',  'Ramon Bautista',   'CNC furniture cutting',        '1750000', 'SPIN-2026-004', 'Furniture',              '1', '24', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Regular Due',        'Updated',            timestamptz '2026-03-09'),
  ('2026', 'Buguey Bamboo Crafts',        'Liza Mendoza',     'Bamboo gift and decor line',   '640000',  'SPIN-2026-005', 'Gift, Houseware & Decor', '3', '9',  null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Unpaid Penalties',   'Delinquent',         timestamptz '2026-04-10'),
  ('2026', 'Iguig Metal Fabrication',     'Carlos Pascual',   'Metal roofing fabrication',    '1980000', 'SPIN-2026-006', 'Metals & Engineering',   '2', '15', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Regular Due',        'Pending',            timestamptz '2026-04-11'),
  ('2026', 'Gattaran Banana Chips',       'Rosario Agbayani', 'Banana chips and packaging',   '520000',  'SPIN-2026-007', 'Food Processing',        '3', '11', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Fully Paid Projects', 'Fully Paid',        timestamptz '2026-05-12'),
  ('2026', 'Enrile Tilapia Growers',      'Eduardo Tumaneng', 'Tilapia hatchery upgrade',     '1320000', 'SPIN-2026-008', 'Aquaculture',            '1', '17', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Regular Due',        'Updated',            timestamptz '2026-06-13'),
  ('2026', 'Amulung Coffee Roasters',     'Grace Villanueva', 'Coffee roasting equipment',    '760000',  'SPIN-2026-009', 'Food Processing',        '2', '8',  null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Endorsed to OSG',    'Delinquent',         timestamptz '2026-07-14'),
  ('2026', 'Alcala Abaca Weavers',        'Teresita Guzman',  'Abaca fiber processing',       '430000',  'SPIN-2026-010', 'Gift, Houseware & Decor', '1', '21', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Regular Due',        'Pending',            timestamptz '2026-08-15'),
  ('2026', 'Lal-lo Corn Dryers',          'Fernando Rivera',  'Corn drying and storage',      '2100000', 'SPIN-2026-011', 'Agriculture',            '3', '14', null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Past Due',           'Due and Demandable', timestamptz '2026-09-16'),
  ('2026', 'Piat Pottery Collective',     'Nenita Cabanilla', 'Kiln and glazing upgrade',     '390000',  'SPIN-2026-012', 'Gift, Houseware & Decor', '2', '7',  null, 'Processing equipment set', 'GMP, Basic Bookkeeping', 'Fully Paid Projects', 'Fully Paid',        timestamptz '2026-10-17')
) as v(year, firm, beneficiary, project_title, amount_assisted, spin_no, sector, district,
       employee, proposal, equipment, trainings, project_status, status, created_at)
where not exists (select 1 from public.firm f where f.spin_no = v.spin_no);

-- ── Map pins (copies each firm's details, adds its coordinates) ──────────────
insert into public.firm_locations
  (firm, beneficiary, project_title, amount, spin_no, employee, equipment, trainings,
   sector, district, latitude, longitude)
select f.firm, f.beneficiary, f.project_title, f.amount_assisted, f.spin_no, f.employee,
       f.equipment, f.trainings, f.sector, f.district, p.latitude, p.longitude
from (values
  ('SPIN-2026-001', '17.6131', '121.7270'),  -- Tuguegarao City
  ('SPIN-2026-002', '18.3553', '121.6417'),  -- Aparri
  ('SPIN-2026-003', '17.6828', '121.7429'),  -- Solana
  ('SPIN-2026-004', '17.6205', '121.7340'),
  ('SPIN-2026-005', '18.2714', '121.8300'),
  ('SPIN-2026-006', '17.7400', '121.7050'),
  ('SPIN-2026-007', '18.2150', '121.6580'),
  ('SPIN-2026-008', '17.5800', '121.6900')
) as p(spin_no, latitude, longitude)
join public.firm f on f.spin_no = p.spin_no
where not exists (select 1 from public.firm_locations l where l.spin_no = p.spin_no);

-- ── Check ────────────────────────────────────────────────────────────────────
select (select count(*) from public.firm)           as firms,
       (select count(*) from public.firm_locations) as map_pins;
