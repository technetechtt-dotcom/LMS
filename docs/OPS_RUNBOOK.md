# Operations and compliance runbook

## Disaster recovery

1. Default objectives: RPO at most 24 hours and RTO at most 4 hours.
2. The platform owner confirms database PITR and encrypted backup retention with the provider.
3. Quarterly, run the `Operational drills` workflow against a dedicated restore database. Never use the production database as the restore target.
4. Validate migrations, representative tenant/user counts, authentication, evidence downloads, and credential verification.
5. Attach workflow output to the release ticket and update `RESTORE_DRILL_AT` and `RESTORE_DRILL_RESULT` only after review.
6. For failover, promote the verified database target, update `DATABASE_URL`/`DIRECT_URL`, deploy the exact release SHA, verify `/health/ready`, and notify tenants.

Object storage must have provider-side versioning enabled; production readiness now fails closed if the bucket does not report it. Quarterly, restore a deleted test object with `POST /storage/uploads/:id/recover` as an Admin or Platform Admin, verify its SHA-256 checksum, record the resulting `OBJECT_VERSION_RECOVERED` audit event, and never use regulated learner evidence as the drill object. An optional `versionId` request field selects a particular retained version.

## Incident response

1. Create `POST /privacy/incidents` with LOW, MEDIUM, HIGH, or CRITICAL severity.
2. Preserve logs and audit records; do not copy authentication secrets into tickets.
3. Contain by disabling affected accounts/integrations, revoking refresh sessions, and rotating exposed signing or encryption keys.
4. Notify the information officer and regulator/data subjects when legally required under POPIA.
5. Recover from verified database/object versions and validate the exact application revision.
6. Record the timeline, decisions, root cause, remediation, and `resolvedAt` before closure.

## Observability and alerting

- `GET /health/live`: process-only liveness.
- `GET /health/ready`: database/migrations, object storage, scanner, mail, secrets, MFA coverage, worker heartbeat, and application revision.
- `GET /health/integrations`: live object storage, scanner, and mail-provider diagnostics. The mail probe uses `MAIL_DELIVERY_HEALTH_URL` and fails closed in production.
- `GET /metrics`: process memory/uptime plus method-level request counts, server errors, and average latency.
- HTTP logs are structured JSON and include a server-issued request ID returned in `X-Request-Id`.
- The production release requires a working `MONITORING_HEALTHCHECK_URL`. Configure alerts for readiness failure, elevated 5xx rate, worker heartbeat loss, and scanner/mail/object-storage degradation.
- Application decisions remain traceable through `AuditInterceptor` and `AuditLog`; dependency audits, SBOM generation, and secret scanning run in CI.

## Rate limits

The global limit is 200 requests per 60 seconds. Authentication, activation, attendance, privacy, enrollment transitions, reports, and each multipart upload surface have tighter endpoint limits.

## Security testing

Schedule an annual independent web/API penetration test covering tenant isolation, IDOR, assignment escalation, uploads, invitation/reset/MFA, and credential integrity. Critical or high findings block production.

Run the bounded load job against staging and capture request count, error rate, and p95 latency. Increase limits only through an approved drill; the repository script caps concurrency and duration.

## Restore drill log

| Date | Isolated environment | Result | Operator | Evidence link |
|---|---|---|---|---|
| _TBD_ | _TBD_ | Pending | _TBD_ | _TBD_ |

See [SECURITY_PRIVACY_RELEASE.md](./SECURITY_PRIVACY_RELEASE.md) for identity, evidence, privacy, and launch controls.
