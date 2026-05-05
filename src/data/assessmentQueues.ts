import type { Assessment } from '../types';

/** Assessments under a programme that still need moderator sign-off. */
export function pendingModerationForProgramme(
  programmeId: string,
  assessments: Assessment[],
): Assessment[] {
  return assessments.filter(
    (a) => a.programmeId === programmeId && a.needsModeration === true,
  );
}

export function countPendingModeration(
  programmeId: string,
  assessments: Assessment[],
): number {
  return pendingModerationForProgramme(programmeId, assessments).length;
}

/** Assessments recorded against this programme for the current assessor user. */
export function pendingAssessmentsForAssessor(
  programmeId: string,
  assessments: Assessment[],
  assessorUserId: string | undefined,
): Assessment[] {
  if (!assessorUserId) return [];
  return assessments.filter(
    (a) => a.programmeId === programmeId && a.assessorId === assessorUserId,
  );
}

export function countPendingAssessments(
  programmeId: string,
  assessments: Assessment[],
  assessorUserId: string | undefined,
): number {
  return pendingAssessmentsForAssessor(
    programmeId,
    assessments,
    assessorUserId,
  ).length;
}
