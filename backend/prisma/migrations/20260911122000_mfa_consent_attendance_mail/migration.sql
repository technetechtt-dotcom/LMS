CREATE TABLE "MfaRecoveryCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx" ON "MfaRecoveryCode"("userId", "usedAt");
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PopiaAcknowledgement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "PopiaAcknowledgement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PopiaAcknowledgement_userId_organisationId_policyVersion_key" ON "PopiaAcknowledgement"("userId", "organisationId", "policyVersion");
CREATE INDEX "PopiaAcknowledgement_organisationId_policyVersion_idx" ON "PopiaAcknowledgement"("organisationId", "policyVersion");
ALTER TABLE "PopiaAcknowledgement" ADD CONSTRAINT "PopiaAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PopiaAcknowledgement" ADD CONSTRAINT "PopiaAcknowledgement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BreakGlassAccess" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    CONSTRAINT "BreakGlassAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BreakGlassAccess_tokenHash_key" ON "BreakGlassAccess"("tokenHash");
CREATE INDEX "BreakGlassAccess_status_requestedAt_idx" ON "BreakGlassAccess"("status", "requestedAt");
CREATE INDEX "BreakGlassAccess_requestedById_requestedAt_idx" ON "BreakGlassAccess"("requestedById", "requestedAt");
ALTER TABLE "BreakGlassAccess" ADD CONSTRAINT "BreakGlassAccess_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BreakGlassAccess" ADD CONSTRAINT "BreakGlassAccess_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BreakGlassAccess" ADD CONSTRAINT "BreakGlassAccess_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MailDeliveryJob" ADD COLUMN "invitationId" UUID;
CREATE INDEX "MailDeliveryJob_invitationId_status_idx" ON "MailDeliveryJob"("invitationId", "status");
ALTER TABLE "MailDeliveryJob" ADD CONSTRAINT "MailDeliveryJob_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceSession" ADD COLUMN "mandatory" BOOLEAN NOT NULL DEFAULT true;
