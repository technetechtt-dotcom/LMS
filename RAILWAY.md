# Deploy backend + Postgres on Railway

This walks through a **PostgreSQL plugin** attached to your **Nest API** running from the `backend/` folder.

**Using [Neon](https://neon.com/) instead of Railway Postgres?** Skip step 1 and set `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) on the API service from the Neon console. See **[NEON.md](./NEON.md)**.

## 1. Create the database

1. In [Railway](https://railway.app/), open your project (**New Project** if needed).
2. Click **\+ New** → **Database** → **PostgreSQL**.
3. Wait until Postgres is **Active**. Open the Postgres service → **Variables**.
4. Copy **`DATABASE_URL`** (internal URL is fine for a service in the same project).

You do **not** need to create tables by hand; Prisma applies migrations on deploy.

## 2. Deploy the API (Nest)

1. **\+ New** → **GitHub Repo** (or **Empty Service** and connect the repo).
2. Open the new **API service** → **Settings**:
   - **Root Directory**: `backend`
   - **Watch Paths** (optional): `backend/**` so frontend-only commits do not redeploy the API.
3. **Variables** (service environment — not Postgres):

| Name | Example / notes |
|------|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Click **Reference** → choose the **Postgres** service → `DATABASE_URL` (Railway injects the internal URL automatically when linked). |
| `JWT_SECRET` | Generate a random string **≥ 32 characters** (use a password generator). Required in production. |
| `JWT_EXPIRES_IN` | `15m` or `1h` |
| `FRONTEND_ORIGIN` | Your SPA origins, comma-separated: `https://your-app.vercel.app` or Railway static URL once you know it. |
| `PORT` | **Leave unset** — Railway sets `PORT`; Nest listens on it. |

Optional: `REFRESH_TOKEN_TTL_DAYS`, `PASSWORD_RESET_TTL_MINUTES`, `ADMIN_ENDPOINTS_ENABLED=false` (locks admin maintenance APIs), `AWS_*` for real S3 uploads (see `DEPLOYMENT.md`).

4. **Deploy**: Railway reads `backend/railway.toml`:
   - **Build**: `npm ci --include=dev && npm run build` (needs devDeps for TypeScript + Nest CLI).
   - **Start**: `npm run start:railway` → **`prisma migrate deploy`** then **`node dist/main.js`**.

5. First deploy assumes a **greenfield** database (empty schema). If `migrate deploy` fails because objects already exist, see **Brownfield** in `DEPLOYMENT.md`.

## 3. Smoke test

- **Health**: open `https://<your-api>.up.railway.app/health` — expect `{"ok":true,...}`.
- **Docs** (non-production only locally): Swagger is disabled when `NODE_ENV=production`; use Postman against `/auth/login`, etc.

## 4. Seed demo users (once)

Railway shell or local machine with **`DATABASE_URL` pointing at Railway Postgres** (use the **public** URL from Postgres **Connect** tab if connecting from your PC):

```bash
cd backend
export DATABASE_URL="postgresql://..."
npm ci
npm run prisma:seed
```

Do **not** run `seed` in the default start command unless you intentionally want repeatable demo data.

## 5. Frontend

Build the SPA with **`VITE_API_URL=https://<your-api-domain>`** so the browser calls Railway, not `localhost`.

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Build fails: `nest` or `tsc` not found | Confirm build uses **`npm ci --include=dev`** (see `railway.toml`). |
| Start fails: `prisma: command not found` | **`prisma`** is listed in **dependencies** in `backend/package.json` so `migrate deploy` works after a production-oriented install. |
| `JWT_SECRET must be set` | Use a secret ≥32 chars; `NODE_ENV=production` enforces this. |
| `FRONTEND_ORIGIN must list allowed browser origins` | Set `FRONTEND_ORIGIN` to your SPA’s exact HTTPS origin(s). |
| Postgres SSL | Railway’s `DATABASE_URL` usually includes TLS; Prisma accepts it as-is. |
