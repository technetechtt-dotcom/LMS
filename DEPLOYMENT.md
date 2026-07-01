# Enterprise deployment (SkillForge LMS)

## Architecture

- **SPA**: Vite + React (`npm run build` → static assets).
- **API**: NestJS in `backend/` (`npm run build` in backend → `node dist/main.js`).
- **Database**: PostgreSQL via Prisma ([Neon](https://neon.com/) recommended; see **[NEON.md](./NEON.md)**).

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
| `PORT` | No | Default `8787`. |
| `REFRESH_TOKEN_TTL_DAYS` | No | Default `7`. |
| `PASSWORD_RESET_TTL_MINUTES` | No | Default `60`. |
| `ADMIN_ENDPOINTS_ENABLED` | No | Default `true`. Set `false` to return **403** on admin maintenance APIs: **`/users`** (all methods), **`POST /programmes`**, **`POST /organisations`**. Reads and other roles’ routes are unchanged. |
| `LOG_PASSWORD_RESET_LINK` | No | Set `true` only in non-prod to log reset URLs to server logs when email is not wired. |
| `AWS_REGION` | For real uploads | e.g. `af-south-1`. |
| `AWS_S3_BUCKET` | For real uploads | Target bucket for `FileStorageService`. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | For real uploads | Use IAM role / OIDC where possible instead of static keys. If set to `mock` or missing, uploads stay in **mock URL** mode. |

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

## Railway (managed Postgres + API)

See **[RAILWAY.md](./RAILWAY.md)** for step-by-step: Postgres plugin, `DATABASE_URL` reference, `backend/` root directory, and deploy commands.

## Operational checklist

1. Rotate `JWT_SECRET` and refresh tokens periodically.
2. Enable real object storage (`AWS_*` credentials or equivalent) before accepting learner evidence in production.
3. Wire transactional email for password resets (remove reliance on `LOG_PASSWORD_RESET_LINK`).
4. Run `npm test` in `backend/` in CI.
5. Terminate TLS at your edge (load balancer / reverse proxy); do not expose Postgres to the public internet.
