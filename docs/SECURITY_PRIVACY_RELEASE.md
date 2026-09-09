# Security, privacy, and release controls

## Launch policy

Production promotion is fail-closed. The protected release workflow requires a green CI run for the exact commit, exact matching API/LMS/Ops revisions, ready integrations, production approval, a recent successful restore drill, eight-role staging sign-off, security/privacy sign-off, and a live monitoring endpoint. Failed post-deploy verification invokes configured rollback hooks.

Never set a sign-off variable to `approved` or a drill result to `passed` without attaching the evidence to the release ticket.

## Identity and access

- Public registration is disabled in production; accounts use one-time activation or invitation tokens.
- Activation replacement invalidates prior tokens, delivery attempts are audited, and failed delivery enters the encrypted database queue.
- Accounts with no `passwordSetAt` cannot authenticate.
- TOTP secrets are encrypted at rest. Enabled accounts must supply a valid time-based code. Production readiness fails while an active privileged account has not enrolled MFA.
- Tenant context is derived from authenticated membership. Learners, mentors, assessors, moderators, and SETA officials receive assignment-scoped data; platform-wide operations remain isolated to the Ops portal.
- Generic SSO remains disabled until an organisation supplies and approves a certified OIDC/SAML identity provider configuration. Do not represent `/auth/sso/status` as enabled before that integration is completed and tested.

## Evidence and files

- Multipart bodies are size/part/field bounded and staged on disk or private object storage, never buffered wholesale by controllers.
- Server identifiers replace client filenames in storage keys.
- Signature/MIME checks reject disguised binaries, scripts, archives, Office macros, ActiveX, OLE, and embedded executables.
- Every user evidence path records quarantine/scan state, SHA-256, uploader, timestamps, retention, and private storage location. Only `VERIFIED` uploads may be linked or downloaded.
- Completion and credential issuance re-check both the database verification state and the underlying object.
- Production requires private durable object storage and a reachable malware scanner. Enable bucket versioning/object lock according to the provider policy and perform quarterly recovery drills.

## Credentials and competency

- Assessment results come from server-side grading and allocated human decisions.
- Moderation corrections create linked rounds; decided rounds are not overwritten.
- Active credentials are unique per enrollment, are issued transactionally after every completion gate, and carry a detached HMAC-SHA256 signature over their canonical record and PDF checksum.
- Regulatory exports are labelled `Internal draft - Not submitted to SETA`; adapters cannot claim accepted submission until certified.

## Privacy and retention

- Collect only fields required for training delivery and statutory reporting.
- Use `/privacy` workflows for access, correction, erasure review, incident recording, and retention policies.
- Do not erase records subject to a documented statutory hold. Review `UPLOAD_RETENTION_DAYS` and organisation retention policies with the information officer before launch.
- Audit payloads redact passwords, tokens, cookies, authorization headers, and TOTP secrets. Logs use request correlation IDs and omit query strings.

## Incident response

1. Declare severity and create an incident record.
2. Contain: disable affected accounts/integrations, revoke sessions, rotate exposed secrets, and preserve audit evidence.
3. Assess tenant and data-subject impact with the information officer.
4. Notify affected parties and the regulator when legally required.
5. Recover only from verified backups/artifact versions; validate `/health/ready` and the exact revision.
6. Record timeline, decisions, evidence, root cause, and corrective actions before closure.

## External responsibilities

The repository cannot itself certify a SETA/QCTO/SAQA adapter, activate a monitoring vendor, approve a privacy review, enable storage versioning, or prove a restore. Those controls require named human owners and provider-side evidence. The release workflow intentionally blocks production until the corresponding environment approvals are present.
