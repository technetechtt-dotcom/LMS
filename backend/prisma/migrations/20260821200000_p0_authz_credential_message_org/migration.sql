-- P0: message tenant scope, credentials, workplace mentor verification
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "organisationId" UUID;

-- Backfill from sender primary membership when possible
UPDATE "Message" m
SET "organisationId" = (
  SELECT uo."organisationId"
  FROM "UserOrganisation" uo
  WHERE uo."userId" = m."fromId" AND uo."deletedAt" IS NULL
  ORDER BY uo."isPrimary" DESC, uo."createdAt" ASC
  LIMIT 1
)
WHERE m."organisationId" IS NULL;

-- Drop any messages that still lack org (orphan) — safer than failing migration
DELETE FROM "Message" WHERE "organisationId" IS NULL;

ALTER TABLE "Message" ALTER COLUMN "organisationId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Message"
    ADD CONSTRAINT "Message_organisationId_fkey"
    FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Message_organisationId_createdAt_idx"
  ON "Message"("organisationId", "createdAt");

ALTER TABLE "WorkplaceLog" ADD COLUMN IF NOT EXISTS "mentorStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "WorkplaceLog" ADD COLUMN IF NOT EXISTS "mentorVerifiedAt" TIMESTAMP(3);
ALTER TABLE "WorkplaceLog" ADD COLUMN IF NOT EXISTS "mentorVerifiedById" UUID;
ALTER TABLE "WorkplaceLog" ADD COLUMN IF NOT EXISTS "mentorFeedback" TEXT;

DO $$ BEGIN
  ALTER TABLE "WorkplaceLog"
    ADD CONSTRAINT "WorkplaceLog_mentorVerifiedById_fkey"
    FOREIGN KEY ("mentorVerifiedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "WorkplaceLog_enrollmentId_mentorStatus_idx"
  ON "WorkplaceLog"("enrollmentId", "mentorStatus");

DO $$ BEGIN
  CREATE TYPE "CredentialStatus" AS ENUM ('ISSUED', 'REVOKED', 'SUPERSEDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Credential" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "certificateNumber" TEXT NOT NULL,
  "verificationCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "learnerName" TEXT NOT NULL,
  "programmeName" TEXT NOT NULL,
  "status" "CredentialStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuedById" UUID,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "supersedesId" UUID,
  "pdfStorageKey" TEXT NOT NULL,
  "pdfSha256" TEXT,
  "documentId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Credential_certificateNumber_key" ON "Credential"("certificateNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Credential_verificationCode_key" ON "Credential"("verificationCode");
CREATE INDEX IF NOT EXISTS "Credential_organisationId_status_idx" ON "Credential"("organisationId", "status");
CREATE INDEX IF NOT EXISTS "Credential_enrollmentId_idx" ON "Credential"("enrollmentId");
CREATE INDEX IF NOT EXISTS "Credential_verificationCode_idx" ON "Credential"("verificationCode");

DO $$ BEGIN
  ALTER TABLE "Credential"
    ADD CONSTRAINT "Credential_organisationId_fkey"
    FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Credential"
    ADD CONSTRAINT "Credential_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Credential"
    ADD CONSTRAINT "Credential_issuedById_fkey"
    FOREIGN KEY ("issuedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Credential"
    ADD CONSTRAINT "Credential_supersedesId_fkey"
    FOREIGN KEY ("supersedesId") REFERENCES "Credential"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "Role" ("id", "code", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'PLATFORM_ADMIN', 'Platform Super Admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "code" = 'PLATFORM_ADMIN');
