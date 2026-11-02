# Supabase setup (PSTO)

Do these steps in order. Total time: ~10 minutes.

## 1. Create a project

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → pick region close to PH.

## 2. Run SQL

**SQL Editor** → **New query** → paste the full contents of **`setup.sql`** → **Run**.

You should see success (no errors). This creates:

- Tables: `profiles`, `firm`, `firm_locations`
- RLS policies (logged-in users can read/write)
- Storage bucket `proposals` (public read for PDF links)
- 3 sample firms + 3 map pins (only if tables are empty)

## 3. Auth settings (important)

**Authentication** → **Providers** → **Email**:

- Turn **OFF** “Confirm email” (recommended for `@psto.local` test accounts), **or** always tick **Auto Confirm** when adding users.

**Authentication** → **URL configuration** (optional for local dev):

- Site URL: `http://127.0.0.1:5173`
- Redirect URLs: add `http://127.0.0.1:5173/**`

## 4. Create a login user

**Authentication** → **Users** → **Add user** → **Create new user**:

| Field | Value |
|--------|--------|
| Email | `admin@psto.local` |
| Password | pick something you’ll remember (e.g. `Admin123!`) |
| Auto Confirm User | **ON** |

The app login screen uses **username** `admin` (not the full email). That maps to `admin@psto.local`.

Optional super admin — add another user `superadmin@psto.local`, then in SQL Editor:

```sql
update public.profiles set role = 'superadmin' where username = 'superadmin';
```

If `profiles` has no row for that user:

```sql
insert into public.profiles (id, username, role)
select id, 'superadmin', 'superadmin' from auth.users where email = 'superadmin@psto.local'
on conflict (id) do update set role = 'superadmin';
```

## 5. Client environment

**Project Settings** → **API** → copy **Project URL** and **anon public** key.

Create `client/.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Optional — test login from terminal:

```env
PSTO_TEST_USER=admin
PSTO_TEST_PASSWORD=Admin123!
```

## 6. Run the app

```powershell
cd client
npm install
npm run dev
```

Open http://127.0.0.1:5173 → login **admin** / your password.

## 7. Verify Supabase (optional)

```powershell
cd client
npm run verify:supabase
```

Checks env, tables, storage bucket, and (if `PSTO_TEST_*` set) sign-in + sample data.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| “Invalid login credentials” | Email must be `admin@psto.local`; user must be **Auto Confirm** |
| “Missing Supabase env” | Add `client/.env` and restart `npm run dev` |
| “Not authenticated” after login | Run profile backfill SQL in step 4 |
| Empty dashboard/map | Re-run seed section in `setup.sql` on empty tables, or add rows in **Table Editor** |
| PDF upload fails | Confirm bucket `proposals` exists under **Storage** |
