# Enterprise deployment (SkillForge LMS)

## Architecture

- **SPA**: Vite + React (`npm run build` → static assets).
- **API**: NestJS in `backend/` (`npm run build` in backend → `node dist/src/main.js`).
- **Database**: PostgreSQL via Prisma ([Neon](https://neon.com/); see **[NEON.md](./NEON.md)**).
- **Files**: local disk on the API host (Render persistent disk in production).

## Environment

### Backend (`backend/.env`)

| Variable | Required in production | Notes |
|----------|------------------------|--------|
| `NODE_ENV` | Recommended | `production` enables stricter config validation. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon **pooled** URL in production). |
| `DIRECT_URL` | Yes | Direct Postgres URL for Prisma migrations (Neon **direct** URL; for local dev, same as `DATABASE_URL`). |
| `JWT_SECRET` | Yes | Min 32 characters; must not be a placeholder. |
| `JWT_EXPIRES_IN` | No | Access token TTL (e.g. `15m`, `1h`). |
| `FRONTEND_ORIGIN` | Yes | Comma-separated browser origins for CORS. |
| `OPS_ORIGIN` | When deploying the ops portal | Ops portal origin for CORS. |
| `PORT` | No | Default `8787`. |
| `REFRESH_TOKEN_TTL_DAYS` | No | Default `7`. |
| `PASSWORD_RESET_TTL_MINUTES` | No | Default `60`. |
| `ADMIN_ENDPOINTS_ENABLED` | No | Defaults to `false` in production. Set `true` only for a controlled maintenance window. |
| `UPLOAD_DIR` | No | Local folder for uploads. Render disk is `/var/data/uploads`. Defaults to `uploads`. |
| `UPLOAD_MAX_MB` | No | Max upload size in megabytes (default `25`). |
| `API_PUBLIC_URL` | No | Public API origin used in download links. On Render this is `RENDER_EXTERNAL_URL`. |

### Frontend (`VITE_API_URL`)

Set to the **public HTTPS URL** of the API (no trailing slash). Built assets embed this value at compile time.

## Database migrations

**Greenfield:**

```bash
cd backend
npm ci
npm run prisma:migrate:deploy
npm run seed
```

**Brownfield:** If you already ran `prisma db push` against an older copy of the schema, align with your DBA team before applying `migrate deploy`. The baseline migration is `backend/prisma/migrations/20260204210000_initial_schema/`.

## Runtime hardening

- **Swagger** is mounted only when `NODE_ENV !== 'production'`.
- **CORS** uses `FRONTEND_ORIGIN` in production (comma-separated list).
- **Global exception filter** returns JSON `{ success: false, statusCode, message }` without leaking stack traces in production.
- **Throttling** protects auth endpoints (`@nestjs/throttler`).

## Render Blueprint + Neon

The root [`render.yaml`](./render.yaml) creates three services:

- `lms-api`: paid Render web service in Ohio with a persistent disk for uploads
- `lms-web`: learner/staff Vite static site
- `lms-ops`: operations Vite static site

Click **Apply** on the YAML preview. Then open **lms-api → Environment** and add Neon **LMS** `DATABASE_URL` (pooled) and `DIRECT_URL` (direct), then **Manual Deploy**. Migrations run on API start. Health returns `503` until Neon is connected.

The Blueprint uses **Neon** for Postgres and a **Render persistent disk** (`/var/data`) for uploads. There is no AWS, SMTP, or antivirus dependency.

## Railway (managed Postgres + API)

See **[RAILWAY.md](./RAILWAY.md)** for step-by-step: Postgres plugin, `DATABASE_URL` reference, `backend/` root directory, and deploy commands.

## Operational checklist

1. Rotate `JWT_SECRET` and refresh tokens periodically.
2. Confirm the Render disk is mounted at `/var/data` before accepting learner evidence.
3. Read password-reset and invite links from Render API logs (no SMTP).
4. Run `npm test` in `backend/` in CI.
5. Terminate TLS at your edge (load balancer / reverse proxy); do not expose Postgres to the public internet.
