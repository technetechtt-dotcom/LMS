# Connect SkillForge LMS to [Neon](https://neon.com/)

Neon is serverless PostgreSQL. This app already uses **Prisma + Postgres**; you only need a Neon project and two connection strings.

## 1. Create a Neon project

1. Sign up at [neon.com](https://neon.com/) and create a **project** (pick a region close to your API, e.g. `af-south-1` for South Africa).
2. Open the project → **Connect**.
3. Copy two strings:
   - **Pooled connection** → `DATABASE_URL` (hostname includes `-pooler`)
   - **Direct connection** → `DIRECT_URL` (no `-pooler`; required for migrations)

Both should include `?sslmode=require`.

## 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `JWT_SECRET` | Random string ≥ 32 characters |
| `FRONTEND_ORIGIN` | `http://localhost:5173` (local) or your SPA URL |

## 3. Apply schema and seed

From the repo root:

```bash
npm run backend:prisma:generate
npm run backend:prisma:migrate:deploy
npm run backend:seed
```

Or from `backend/`:

```bash
npm ci
npx prisma migrate deploy
npm run seed
```

`migrate deploy` uses `DIRECT_URL` (see `schema.prisma`). The API at runtime uses the pooled `DATABASE_URL`.

## 4. Run locally

```bash
npm run dev:full
```

- SPA: http://localhost:5173  
- API: http://localhost:8787/health  

Demo logins are in `backend/prisma/seed.ts` (password: `Password123!`).

## 5. Deploy API with Neon (Railway, Render, Fly, etc.)

Set these **environment variables** on your API host (not in the frontend):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** string |
| `DIRECT_URL` | Neon **direct** string (needed if you run `prisma migrate deploy` on deploy) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | ≥ 32 chars |
| `FRONTEND_ORIGIN` | Your SPA origin(s), comma-separated |

Build/start (same as Railway): `prisma migrate deploy` then `node dist/main.js` — see `backend/package.json` script `start:railway`.

Point the SPA build at your API:

```bash
VITE_API_URL=https://your-api.example.com npm run build
```

## 6. Neon branches (optional)

Neon supports [database branches](https://neon.com/) for preview environments:

- Create a branch per PR in the Neon console or via API.
- Use that branch’s pooled + direct URLs as `DATABASE_URL` / `DIRECT_URL` for a preview API.
- Run `prisma migrate deploy` against the branch’s `DIRECT_URL`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Environment variable not found: DIRECT_URL` | Add `DIRECT_URL` to `backend/.env` (direct Neon URL). |
| Migration SSL errors | Ensure `?sslmode=require` on both URLs. |
| `too many connections` | Use the **pooled** URL for `DATABASE_URL`, not the direct URL. |
| `JWT_SECRET must be set` | Set a secret ≥ 32 chars; required when `NODE_ENV=production`. |
| Empty app after login | Run `npm run backend:seed` against the same database. |

## Local Postgres without Neon

If you use Docker or local Postgres, set **the same** connection string for both variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/lms?schema=public
```
