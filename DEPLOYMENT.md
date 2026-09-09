# Enterprise deployment (SkillForge LMS)

## Architecture

- **Portals:** Vite + React learner/staff and Ops static sites.
- **API:** NestJS in `backend/`.
- **Database:** PostgreSQL via Prisma.
- **Evidence:** a private S3-compatible bucket with quarantine, malware scanning, checksums, verified state, and retention metadata.

## Required production configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Pooled runtime and direct migration PostgreSQL URLs. |
| `JWT_SECRET` | Unique secret of at least 32 characters. |
| `FRONTEND_ORIGIN`, `OPS_ORIGIN` | Exact browser origins allowed by CORS. |
| `ADMIN_ENDPOINTS_ENABLED=true` | Keeps authorised provisioning available; role and tenant guards remain enforced. |
| `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION` | Private S3-compatible object store. |
| `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Least-privilege object-store credentials. |
| `MALWARE_SCAN_URL` | HTTPS scanner webhook. It must return `{ "clean": true }` only after scanning the quarantined object. |
| `MALWARE_SCAN_TOKEN` | Scanner bearer credential, when required. |
| `MAIL_DELIVERY_URL` | HTTPS delivery webhook for activation and reset mail. |
| `MAIL_DELIVERY_TOKEN` | Mail provider bearer credential, when required. |
| `UPLOAD_RETENTION_DAYS` | Retention deadline recorded per upload; default is 2555 days. |

`UPLOAD_DIR` is for local development only. The API fails closed in production if durable storage, the scanner, or the mail delivery endpoint is absent. The object bucket must not be public.

## Database migrations

```bash
cd backend
npm ci
npm run prisma:migrate:deploy
```

Never run the development seed in production. The seed refuses to run with `NODE_ENV=production`, and the release-hardening migration deactivates the known development accounts.

## Render and protected releases

The root `render.yaml` defines `lms-api`, `lms-web`, and `lms-ops`. All three have Render auto-deploy disabled. After applying the Blueprint, enter every `sync: false` value manually in Render; adding such a key to an existing Blueprint does not prompt automatically.

`.github/workflows/release.yml` runs only for a successful `CI` workflow on `main`. It deploys the staging services, waits for health, runs browser acceptance against the deployed portals, and only then enters the protected `production` GitHub environment before invoking production deploy hooks.

Configure these repository controls:

1. Protect `main`; disallow direct pushes and force-pushes.
2. Require pull requests and the `frontend`, `backend`, `e2e-playwright`, and `security` checks.
3. Configure `staging` URLs/Render hooks in the GitHub staging environment.
4. Configure production Render hooks in the GitHub production environment and require independent reviewers.
5. Rotate JWT, object-store, mail/scanner, database, and deploy-hook secrets on schedule.

## Operational acceptance

Before releasing, verify activation/reset delivery, cross-portal concurrent sessions, evidence quarantine and scanner promotion, migrations, tenant isolation, and role-complete assessment/moderation/attendance workflows. Test object-version recovery and database restore quarterly; record the observed RPO/RTO rather than presenting targets as completed tests.
