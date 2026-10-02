CREATE TABLE "Feedback" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_organisationId_status_createdAt_idx" ON "Feedback"("organisationId", "status", "createdAt");
CREATE INDEX "Feedback_submittedById_createdAt_idx" ON "Feedback"("submittedById", "createdAt");
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AuditorFinding" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "auditorId" UUID NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "finding" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "evidenceDocumentIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "AuditorFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditorFinding_organisationId_status_createdAt_idx" ON "AuditorFinding"("organisationId", "status", "createdAt");
CREATE INDEX "AuditorFinding_auditorId_createdAt_idx" ON "AuditorFinding"("auditorId", "createdAt");
ALTER TABLE "AuditorFinding" ADD CONSTRAINT "AuditorFinding_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditorFinding" ADD CONSTRAINT "AuditorFinding_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AuditLog is an append-only system ledger. Even a compromised application role
-- cannot rewrite or erase a recorded event after this migration is applied.
CREATE OR REPLACE FUNCTION "reject_audit_log_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_append_only_update"
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "reject_audit_log_mutation"();

CREATE TRIGGER "AuditLog_append_only_delete"
BEFORE DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "reject_audit_log_mutation"();
