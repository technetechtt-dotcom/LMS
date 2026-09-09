# Product positioning

**SkillForge** is a **Digital Skills Development, Assessment and Compliance Operating System** — not a generic Moodle-style LMS.

## Core operating stack

```
Programme Management
        +
Learner Administration
        +
Attendance
        +
Workplace Learning
        +
PoE
        +
Assessment
        +
Assessor Workflow
        +
Moderation
        +
Compliance
        +
Credentials
        +
Audit
```

## Commercial description

Use:

> Digital Skills Development, Assessment and Compliance Operating System

Prefer over:

> LMS

## Enterprise capability boundary

Capability status is advertised live at `GET /enterprise/capabilities` (public).

Live security and governance controls:

- TOTP enrollment, verification, login enforcement, and administrator-facing MFA readiness
- POPIA request, incident, retention, evidence, and alert workflows
- `GET /auth/sso/status` truthfully reports the currently configured SSO capability
- `GET /enterprise/billing/status`, `GET /enterprise/integrations`

Provider-dependent or roadmap capabilities (not claimed as live):

- WebAuthn/passkeys, SAML, OIDC, corporate SSO
- Tenant subscription/billing, employer portal, dedicated mentor portal
- Configurable qualification/completion engine, bulk onboarding
- Document templates, digital signatures
- SCORM, xAPI, LTI, webhooks/API ecosystem
- Offline assessment sync, advanced analytics, learner-risk predictions
- Additional accreditation-expiry automation beyond the implemented evidence-backed alerts

## Programme completion rules

Admins/QA set programme gates via:

- `GET /programmes/:id/completion-requirements`
- `PATCH /programmes/:id/completion-requirements`

These drive enrollment completion and certificate issuance.
