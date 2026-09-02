-- Moderation allocation: PENDING before a moderator records a decision.
ALTER TYPE "ModerationDecision" ADD VALUE IF NOT EXISTS 'PENDING';
