/** Four-stage assessment workflow status labels. */
export function submissionStageLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Awaiting facilitator marking';
    case 'facilitator_grading':
    case 'grading':
      return 'Facilitator marking';
    case 'facilitator_graded':
      return 'Awaiting assessor review';
    case 'assessor_review':
      return 'Assessor reviewing';
    case 'assessor_verified':
      return 'Awaiting moderation';
    case 'completed':
      return 'Moderation approved';
    case 'rejected':
      return 'Moderation rejected';
    default:
      return status;
  }
}

export function canRoleEditSubmission(
  userRole: string,
  status: string,
): boolean {
  if (userRole === 'SDP Admin') return !['completed', 'rejected'].includes(status);
  if (userRole === 'Facilitator') {
    return ['submitted', 'facilitator_grading', 'grading'].includes(status);
  }
  if (userRole === 'Assessor') {
    return ['facilitator_graded', 'assessor_review'].includes(status);
  }
  if (userRole === 'Moderator') {
    return status === 'assessor_verified';
  }
  return false;
}

export function workflowStepForRole(userRole: string): number {
  switch (userRole) {
    case 'Facilitator':
      return 2;
    case 'Assessor':
      return 3;
    case 'Moderator':
      return 4;
    default:
      return 1;
  }
}
