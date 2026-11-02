# PSTO data layer (Supabase)

All server access goes through **`client/src/api/index.ts`** (`api` object).

## Auth

- Sign in with username + password → `username@psto.local` (see `lib/supabase.ts`)
- Session handled by `@supabase/supabase-js`
- Profile row: `public.profiles` (`username`, `role`)

## Tables

| Table | Purpose |
|--------|---------|
| `firm` | MSME / project records, PDF path in `proposal` |
| `firm_locations` | Map markers |

RLS policies are in `supabase/schema.sql` (authenticated read/write).

## Storage

Bucket **`proposals`** — uploads from the Firms form; public URLs via `lib/storage.ts` → `proposalPublicUrl()`.

## Roadmap

See `PLANNED_FEATURES` in `client/src/constants.ts`.
