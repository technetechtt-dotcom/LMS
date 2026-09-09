-- Security release blockers: immutable moderation rounds, verified evidence
-- linkage, delivery audit/queue, report download audit and upload provenance.

ALTER TABLE "UploadRecord"
  ADD COLUMN "uploadedById" UUID,
  ADD COLUMN "scanResult" TEXT,
  ADD COLUMN "scannedAt" TIMESTAMP(3);
CREATE INDEX "UploadRecord_uploadedById_createdAt_idx" ON "UploadRecord"("uploadedById", "createdAt");
ALTER TABLE "UploadRecord" ADD CONSTRAINT "UploadRecord_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadRecord" ADD CONSTRAINT "UploadRecord_status_check"
  CHECK ("status" IN ('QUARANTINED','SCANNING','VERIFIED','REJECTED','FAILED','PURGED','LEGACY_UNVERIFIED'));
ALTER TABLE "UploadRecord" ADD CONSTRAINT "UploadRecord_verified_state_check"
  CHECK ("status" <> 'VERIFIED' OR ("storageKey" IS NOT NULL AND "sha256" IS NOT NULL AND "verifiedAt" IS NOT NULL));

ALTER TABLE "Document" ADD COLUMN "uploadId" UUID;
CREATE UNIQUE INDEX "Document_uploadId_key" ON "Document"("uploadId");
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "UploadRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Evidence" ADD COLUMN "uploadId" UUID;
INSERT INTO "UploadRecord" (
  "id", "organisationId", "uploadedById", "originalName", "mimeType", "size",
  "provider", "quarantineKey", "status", "failureReason", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), e."sdioOrganisationId", v."uploadedById", v."fileName",
  v."fileType", v."fileSize", 'legacy', 'legacy-evidence/' || v."id", 'LEGACY_UNVERIFIED',
  'Legacy evidence requires a fresh verified upload', v."createdAt", CURRENT_TIMESTAMP
FROM "Evidence" v
JOIN "Enrollment" e ON e."id" = v."enrollmentId";
UPDATE "Evidence" v
SET "uploadId" = u."id"
FROM "UploadRecord" u
WHERE u."provider" = 'legacy'
  AND u."quarantineKey" = 'legacy-evidence/' || v."id";
ALTER TABLE "Evidence" ALTER COLUMN "uploadId" SET NOT NULL;
CREATE UNIQUE INDEX "Evidence_uploadId_key" ON "Evidence"("uploadId");
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "UploadRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PoeArtifactUpload" (
  "id" UUID NOT NULL,
  "artifactId" UUID NOT NULL,
  "uploadId" UUID NOT NULL,
  "linkedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PoeArtifactUpload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PoeArtifactUpload_artifactId_uploadId_key" ON "PoeArtifactUpload"("artifactId", "uploadId");
CREATE INDEX "PoeArtifactUpload_uploadId_idx" ON "PoeArtifactUpload"("uploadId");
ALTER TABLE "PoeArtifactUpload" ADD CONSTRAINT "PoeArtifactUpload_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "PoeLearningArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PoeArtifactUpload" ADD CONSTRAINT "PoeArtifactUpload_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "UploadRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PoeArtifactUpload" ADD CONSTRAINT "PoeArtifactUpload_linkedById_fkey"
  FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Moderation_assessmentId_key";
ALTER TABLE "Moderation"
  ADD COLUMN "round" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "submittedVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "sampledRecords" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "previousOutcome" "ModerationDecision",
  ADD COLUMN "supersedesId" UUID;
ALTER TABLE "Moderation" ALTER COLUMN "moderatedAt" DROP NOT NULL;
ALTER TABLE "Moderation" ALTER COLUMN "moderatedAt" DROP DEFAULT;
CREATE UNIQUE INDEX "Moderation_assessmentId_round_key" ON "Moderation"("assessmentId", "round");
CREATE UNIQUE INDEX "Moderation_supersedesId_key" ON "Moderation"("supersedesId");
CREATE INDEX "Moderation_assessmentId_moderatedAt_idx" ON "Moderation"("assessmentId", "moderatedAt");
CREATE INDEX "Moderation_moderatorId_decision_idx" ON "Moderation"("moderatorId", "decision");
ALTER TABLE "Moderation" ADD CONSTRAINT "Moderation_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "Moderation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Moderation" ADD CONSTRAINT "Moderation_round_check" CHECK ("round" > 0);

CREATE UNIQUE INDEX "Credential_one_active_per_enrollment"
  ON "Credential"("enrollmentId") WHERE "status" = 'ISSUED';

CREATE TABLE "MailDeliveryAttempt" (
  "id" UUID NOT NULL,
  "organisationId" UUID,
  "userId" UUID,
  "recipient" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "error" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailDeliveryAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MailDeliveryAttempt_userId_attemptedAt_idx" ON "MailDeliveryAttempt"("userId", "attemptedAt");
CREATE INDEX "MailDeliveryAttempt_organisationId_status_attemptedAt_idx" ON "MailDeliveryAttempt"("organisationId", "status", "attemptedAt");
ALTER TABLE "MailDeliveryAttempt" ADD CONSTRAINT "MailDeliveryAttempt_status_check"
  CHECK ("status" IN ('SENT','FAILED'));
ALTER TABLE "MailDeliveryAttempt" ADD CONSTRAINT "MailDeliveryAttempt_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MailDeliveryAttempt" ADD CONSTRAINT "MailDeliveryAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MailDeliveryJob" (
  "id" UUID NOT NULL,
  "organisationId" UUID,
  "userId" UUID,
  "recipient" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "actionUrlCiphertext" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailDeliveryJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MailDeliveryJob_status_availableAt_idx" ON "MailDeliveryJob"("status", "availableAt");
ALTER TABLE "MailDeliveryJob" ADD CONSTRAINT "MailDeliveryJob_status_check"
  CHECK ("status" IN ('QUEUED','PROCESSING','COMPLETED','DEAD'));
ALTER TABLE "MailDeliveryJob" ADD CONSTRAINT "MailDeliveryJob_attempts_check" CHECK ("attempts" >= 0);
ALTER TABLE "MailDeliveryJob" ADD CONSTRAINT "MailDeliveryJob_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MailDeliveryJob" ADD CONSTRAINT "MailDeliveryJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReportDownload" (
  "id" UUID NOT NULL,
  "reportId" UUID,
  "organisationId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "requesterRole" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "filters" JSONB NOT NULL DEFAULT '{}',
  "fileSha256" TEXT NOT NULL,
  "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportDownload_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReportDownload_organisationId_downloadedAt_idx" ON "ReportDownload"("organisationId", "downloadedAt");
CREATE INDEX "ReportDownload_requestedById_downloadedAt_idx" ON "ReportDownload"("requestedById", "downloadedAt");
ALTER TABLE "ReportDownload" ADD CONSTRAINT "ReportDownload_checksum_check"
  CHECK (char_length("fileSha256") = 64);
ALTER TABLE "ReportDownload" ADD CONSTRAINT "ReportDownload_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "GeneratedReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportDownload" ADD CONSTRAINT "ReportDownload_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportDownload" ADD CONSTRAINT "ReportDownload_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD COLUMN "lastProviderMessageId" TEXT;

ALTER TABLE "ComplianceDecision" ADD COLUMN "evidenceDocumentIds" JSONB NOT NULL DEFAULT '[]';
CREATE TABLE "ComplianceAlert" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "controlKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "acknowledgedById" UUID,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedById" UUID,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  "evidenceDocumentIds" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceAlert_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceAlert_status_check" CHECK ("status" IN ('OPEN','ACKNOWLEDGED','RESOLVED'))
);
CREATE INDEX "ComplianceAlert_organisationId_status_createdAt_idx" ON "ComplianceAlert"("organisationId", "status", "createdAt");
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_acknowledgedById_fkey"
  FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
