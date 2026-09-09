# SkillForge LMS

SETA / QCTO–aligned Learning Management System: React (Vite) SPA + NestJS API + Prisma / PostgreSQL (Neon).

## Architecture

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite, React Router, Tailwind |
| API | NestJS 11 on port `8787` |
| Data | Prisma 5 + PostgreSQL |
| Auth | JWT access token + HttpOnly refresh cookie (`sf_refresh`) |
| Tenancy | `X-Organisation-Id` + `UserOrganisation` membership (TenantGuard) |
| Files | Local disk on the Render API (persistent disk), signed GET URLs |

## Local development

```bash
cp backend/.env.example backend/.env
# set DATABASE_URL, DIRECT_URL, JWT_SECRET, FRONTEND_ORIGIN

npm install
npm --prefix backend install
npm run backend:prisma:migrate:deploy
npm run backend:seed
npm run dev:full
```

- Web: http://localhost:5173  
- API: http://localhost:8787  
- Seed login: `admin@skillforge.co.za` / `Password123!`

## Security baselines (Phases 1–2+)

- Organisation scoping on enrollments, programmes, assessments, PoE, attendance, evidence, documents, workplace logs, compliance, messages
- Learners cannot read other enrolments or answer keys
- Assessment submit ignores client `score` / `isCorrect` / `maxScore`
- PoE verify uses authenticated user (no client `verifierId`)
- Refresh token is cookie-only in JSON responses

## PoE workflow

`POST /poe-artifacts` and `POST /poe-artifacts/:id/transition` with actions:

`issue` → `submit` → `facilitator_mark` → `allocate_assessor` → `assessor_mark` → `submit_moderation` → `moderate_approve` | `moderate_reject`

Certificates require enrolment `COMPLETED`, all assessments `C`, and approved workbook/summative PoE artifacts. PDFs include a QR linking to `GET /certificates/verify/:code`.

## Compliance exports

- `POST /compliance/nlrd` — validated NLRD XML from enrolments (+ submission history document)
- `POST /compliance/seta-export` — SETA snapshot XML/JSON

## Assessment instruments

`AssessmentInstrument` versions question banks per unit standard. Submissions store `instrumentId` to freeze the bank used at attempt time.

## Production (Render)

See root `render.yaml`. Production requires the database, signing/encryption secrets, private object storage, malware-scanner, and mail-provider settings represented there. Activation links are sent by the configured provider and retry payloads are encrypted; they are never written to application logs.

## Tests

```bash
npm --prefix backend test
npm --prefix backend run typecheck
```

## Enterprise boundary

TOTP MFA and POPIA request/incident/retention workflows are implemented. Generic SSO remains disabled until a tenant-approved OIDC/SAML provider is configured and certified. SCORM/xAPI/LTI and offline/mobile synchronisation remain interoperability roadmap items, not capabilities claimed by this release.

## Legacy Express API

The former `server/` mock Express app has been removed. Use Nest (`npm run dev:api` / `dev:full`) only.
