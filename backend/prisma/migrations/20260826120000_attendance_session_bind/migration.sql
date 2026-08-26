-- CompetencyResult.PENDING is committed by prior migration; safe to use as default now.
ALTER TABLE "Assessment" ALTER COLUMN "result" SET DEFAULT 'PENDING';

-- Bind attendance check-ins to QR sessions (anti-replay + programme denominator)
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "sessionId" UUID;

DO $$ BEGIN
  ALTER TABLE "Attendance"
    ADD CONSTRAINT "Attendance_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_sessionId_enrollmentId_key"
  ON "Attendance"("sessionId", "enrollmentId");

CREATE INDEX IF NOT EXISTS "Attendance_sessionId_idx" ON "Attendance"("sessionId");
