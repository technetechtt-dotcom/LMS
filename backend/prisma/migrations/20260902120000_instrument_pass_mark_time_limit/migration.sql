-- Persist assessment instrument pass mark and time limit
ALTER TABLE "AssessmentInstrument" ADD COLUMN IF NOT EXISTS "passMark" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "AssessmentInstrument" ADD COLUMN IF NOT EXISTS "timeLimitMinutes" INTEGER;
