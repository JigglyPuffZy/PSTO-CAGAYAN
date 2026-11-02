-- =============================================================================
-- PSTO Cagayan — run this ONCE in Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  role text not null check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

-- ── Firms ───────────────────────────────────────────────────────────────────
create table if not exists public.firm (
  firm_id bigint generated always as identity primary key,
  year text not null default '',
  firm text not null default '',
  beneficiary text not null default '',
  project_title text not null default '',
  amount_assisted text not null default '',
  spin_no text not null default '',
  sector text not null default '',
  district text not null default '1',
  employee text not null default '',
  proposal text,
  equipment text not null default '',
  trainings text not null default '',
  project_status text not null default '',
  status text not null default '',
  created_at timestamptz not null default now()
);

alter table public.firm enable row level security;

drop policy if exists "firm_all_authenticated" on public.firm;
create policy "firm_all_authenticated"
  on public.firm for all to authenticated
  using (true) with check (true);

-- ── Map locations ───────────────────────────────────────────────────────────
create table if not exists public.firm_locations (
  id bigint generated always as identity primary key,
  firm text not null default '',
  beneficiary text not null default '',
  project_title text not null default '',
  amount text not null default '',
  spin_no text not null default '',
  employee text not null default '',
  equipment text not null default '',
  trainings text not null default '',
  sector text not null default '',
  district text not null default '1',
  photo text,
  proposal text,
  latitude text not null default '0',
  longitude text not null default '0',
  created_at timestamptz not null default now()
);

alter table public.firm_locations enable row level security;

drop policy if exists "firm_locations_all_authenticated" on public.firm_locations;
create policy "firm_locations_all_authenticated"
  on public.firm_locations for all to authenticated
  using (true) with check (true);

-- ── Profile on signup (Dashboard → Add user) ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this script
insert into public.profiles (id, username, role)
select
  id,
  split_part(email, '@', 1),
  coalesce(raw_user_meta_data->>'role', 'admin')
from auth.users
on conflict (id) do nothing;

-- ── Storage: proposal PDFs ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('proposals', 'proposals', true)
on conflict (id) do update set public = true;

drop policy if exists "proposals_read" on storage.objects;
drop policy if exists "proposals_upload_authenticated" on storage.objects;
drop policy if exists "proposals_update_authenticated" on storage.objects;
drop policy if exists "proposals_delete_authenticated" on storage.objects;

create policy "proposals_read"
  on storage.objects for select to public
  using (bucket_id = 'proposals');

create policy "proposals_upload_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'proposals');

create policy "proposals_update_authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'proposals');

create policy "proposals_delete_authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'proposals');

-- ── Sample data (skip if you already have rows) ─────────────────────────────
insert into public.firm (
  year, firm, beneficiary, project_title, amount_assisted, spin_no,
  sector, district, employee, equipment, trainings, project_status, status, created_at
)
select * from (values
  (
    '2026', 'Gina''s Fishball', 'Gina Santos', 'Street food equipment upgrade', '250000',
    'SPIN-2026-001', 'Food Processing', '1', 'Juan Dela Cruz', 'Deep fryer, cart',
    'Food safety', 'Regular Due', 'Updated', now() - interval '2 days'
  ),
  (
    '2026', 'Cagayan Water Refilling', 'Nicole Reyes', 'Water refilling station', '180000',
    'SPIN-2026-002', 'Food Processing', '2', 'Maria Lopez', 'Filtration unit',
    'GMP basics', 'Fully Paid Projects', 'Fully Paid', now() - interval '10 days'
  ),
  (
    '2025', 'Valley Metal Works', 'Pedro Bautista', 'Fabrication tools', '320000',
    'SPIN-2025-014', 'Metals & Engineering', '3', 'Ana Villanueva', 'Welding set',
    'Safety training', 'Past Due', 'Due and Demandable', now() - interval '45 days'
  )
) as v(year, firm, beneficiary, project_title, amount_assisted, spin_no, sector, district, employee, equipment, trainings, project_status, status, created_at)
where not exists (select 1 from public.firm limit 1);

insert into public.firm_locations (
  firm, beneficiary, project_title, amount, spin_no, employee, equipment, trainings,
  sector, district, latitude, longitude
)
select * from (values
  (
    'Gina''s Fishball', 'Gina Santos', 'Street food equipment upgrade', '250000',
    'SPIN-2026-001', 'Juan Dela Cruz', 'Deep fryer', 'Food safety',
    'Food Processing', '1', '17.6136', '121.7269'
  ),
  (
    'Cagayan Water Refilling', 'Nicole Reyes', 'Water refilling station', '180000',
    'SPIN-2026-002', 'Maria Lopez', 'Filtration unit', 'GMP basics',
    'Food Processing', '2', '17.6850', '121.7470'
  ),
  (
    'Valley Metal Works', 'Pedro Bautista', 'Fabrication tools', '320000',
    'SPIN-2025-014', 'Ana Villanueva', 'Welding set', 'Safety training',
    'Metals & Engineering', '3', '18.0120', '121.8720'
  )
) as v(firm, beneficiary, project_title, amount, spin_no, employee, equipment, trainings, sector, district, latitude, longitude)
where not exists (select 1 from public.firm_locations limit 1);
