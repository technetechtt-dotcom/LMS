-- Release hardening: activation-only provisioning, portal sessions, durable upload
-- state, persisted preferences/compliance decisions, and generated reports.
ALTER TABLE "User" ADD COLUMN "passwordSetAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RefreshToken" ADD COLUMN "portal" TEXT NOT NULL DEFAULT 'lms';
ALTER TABLE "RefreshToken" ADD COLUMN "lastUsedAt" TIMESTAMP(3);

ALTER TABLE "PasswordResetToken" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_RESET';

CREATE TABLE "UserPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ComplianceDecision" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "controlKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "notes" TEXT,
    "decidedById" UUID NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ComplianceDecision_organisationId_controlKey_key" ON "ComplianceDecision"("organisationId", "controlKey");
CREATE INDEX "ComplianceDecision_organisationId_status_idx" ON "ComplianceDecision"("organisationId", "status");
ALTER TABLE "ComplianceDecision" ADD CONSTRAINT "ComplianceDecision_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceDecision" ADD CONSTRAINT "ComplianceDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GeneratedReport" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "snapshot" JSONB NOT NULL,
    "generatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GeneratedReport_organisationId_createdAt_idx" ON "GeneratedReport"("organisationId", "createdAt");
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "UploadRecord" (
    "id" UUID NOT NULL,
    "organisationId" UUID,
    "storageKey" TEXT,
    "quarantineKey" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUARANTINED',
    "failureReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UploadRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UploadRecord_storageKey_key" ON "UploadRecord"("storageKey");
CREATE INDEX "UploadRecord_organisationId_status_createdAt_idx" ON "UploadRecord"("organisationId", "status", "createdAt");
ALTER TABLE "UploadRecord" ADD CONSTRAINT "UploadRecord_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Known seed identities must never remain usable in a migrated production database.
UPDATE "User"
SET "isActive" = FALSE,
    "passwordHash" = 'DISABLED_SEEDED_ACCOUNT_ROTATE_VIA_ACTIVATION',
    "passwordSetAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE lower("email") IN (
  'admin@skillforge.co.za',
  'learner@skillforge.co.za',
  'assessor@skillforge.co.za',
  'moderator@skillforge.co.za',
  'facilitator@skillforge.co.za',
  'mentor@skillforge.co.za',
  'qa@skillforge.co.za',
  'platform@skillforge.co.za'
);
