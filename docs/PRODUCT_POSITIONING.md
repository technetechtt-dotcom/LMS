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

## Enterprise roadmap (P2)

Capability status is advertised live at `GET /enterprise/capabilities` (public).

Scaffolded (not fully live):

- `POST /auth/mfa/enroll`, `GET /auth/sso/status`
- `GET /enterprise/billing/status`, `GET /enterprise/integrations`

Still planned:

- MFA/TOTP pairing, WebAuthn/passkeys, SAML, OIDC, corporate SSO  
- Tenant subscription/billing, employer portal, dedicated mentor portal  
- Configurable qualification/completion engine, bulk onboarding  
- Document templates, digital signatures  
- SCORM, xAPI, LTI, webhooks/API ecosystem  
- Offline assessment sync, advanced analytics, learner-risk predictions  
- Scheduled compliance reminders, accreditation-expiry monitoring  

## Programme completion rules

Admins/QA set programme gates via:

- `GET /programmes/:id/completion-requirements`
- `PATCH /programmes/:id/completion-requirements`

These drive enrollment completion and certificate issuance.
