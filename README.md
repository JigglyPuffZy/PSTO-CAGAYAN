# PSTO Cagayan — React + Supabase

Full-stack portal for DOST PSTO operations: firm registry, map pins, and dashboard analytics.

| Path | Purpose |
|------|---------|
| `client/` | React 19, Vite, Tailwind 4, TypeScript |
| `supabase/` | Database schema and setup |

## Quick start

1. Follow **[supabase/README.md](./supabase/README.md)** (SQL, storage bucket, users, `client/.env`).
2. Run the app:

```powershell
.\start-dev.ps1
```

Or: `cd client && npm install && npm run dev` → http://127.0.0.1:5173

## Docs

- **[API.md](./API.md)** — how the client uses Supabase
