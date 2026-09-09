import { ForbiddenException } from '@nestjs/common';

export function normalizedTimeLimit(timeLimitMinutes?: number | null): number {
  return Number.isFinite(timeLimitMinutes) && Number(timeLimitMinutes) > 0
    ? Number(timeLimitMinutes)
    : 0;
}

export function assessmentAttemptWindow(
  createdAt: Date,
  timeLimitMinutes?: number | null,
  nowMs = Date.now(),
) {
  const minutes = normalizedTimeLimit(timeLimitMinutes);
  const expiresAt = minutes > 0
    ? new Date(createdAt.getTime() + minutes * 60_000)
    : null;
  return {
    startedAt: createdAt.toISOString(),
    expiresAt: expiresAt?.toISOString() ?? null,
    timeLimitMinutes: minutes || null,
    expired: expiresAt ? expiresAt.getTime() <= nowMs : false,
  };
}

export function assertAssessmentAttemptOpen(
  createdAt: Date,
  timeLimitMinutes?: number | null,
  nowMs = Date.now(),
): void {
  const window = assessmentAttemptWindow(createdAt, timeLimitMinutes, nowMs);
  if (window.expired) {
    throw new ForbiddenException('Assessment time has expired');
  }
}
