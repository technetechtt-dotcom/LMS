# Operations & compliance runbooks

## Disaster recovery

1. **RPO / RTO targets (default):** RPO ≤ 24h (Neon PITR), RTO ≤ 4h for API restore.
2. **Backup owner:** Platform admin; Neon automatic backups + weekly `pg_dump` to encrypted object storage.
3. **Restore test cadence:** Quarterly — restore to a branch, run `prisma migrate deploy`, smoke `/health`, login, issue credential verify.
4. **Fail-over steps:** promote Neon branch → update `DATABASE_URL`/`DIRECT_URL` → redeploy API → invalidate CDN → notify tenants.
5. **Validation checklist:** health OK, migrations applied, seed not required in prod, certificate verify endpoint live.

## Breach / incident management

1. Open `POST /privacy/incidents` with severity (LOW|MEDIUM|HIGH|CRITICAL).
2. Contain: rotate JWT secret if tokens may be compromised; revoke refresh tokens; disable compromised accounts.
3. Notify DPO / regulator per POPIA timelines; record actions in incident metadata.
4. Close with status RESOLVED + `resolvedAt`.

## External penetration test

Schedule an annual independent web/API pentest covering:
- tenant isolation / IDOR
- enrollment & assessment privilege escalation
- file upload / AV bypass
- auth (invite, reset, MFA when live)

Track findings in Issues; block production accreditation until Critical/High are closed.

## Observability

- `GET /health` — liveness + DB ping
- `GET /metrics` — process uptime / memory (Prometheus-style export can replace later)
- Application audit trail via `AuditInterceptor` + `AuditLog`
- CI security job: dependency audit, SBOM, gitleaks (see `.github/workflows/ci.yml`)

## Rate limits

Global Nest throttler: 200 req / 60s. Tighter limits on auth, attendance check-in, privacy DSAR, enrollment transitions.

## Backup restore test log

| Date | Environment | Result | Operator |
|------|-------------|--------|----------|
| _TBD_ | staging | _pending_ |  |
