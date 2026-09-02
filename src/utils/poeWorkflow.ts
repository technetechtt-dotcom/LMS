/** PoE workbook / summative workflow helpers (mirrors assessment chain). */

export function poeStageLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'ISSUED_TO_LEARNER':
      return 'Awaiting learner submission';
    case 'LEARNER_SUBMITTED':
      return 'Awaiting facilitator marking';
    case 'FACILITATOR_MARKED':
      return 'Awaiting assessor allocation';
    case 'ALLOCATED_TO_ASSESSOR':
      return 'Awaiting assessor review';
    case 'ASSESSOR_SATISFACTORY':
      return 'Awaiting moderation submission';
    case 'SUBMITTED_TO_MODERATOR':
      return 'Awaiting moderator approval';
    case 'MODERATION_COMPLETE':
      return 'Moderation complete';
    default:
      return status;
  }
}

export function workflowStepForPoeRole(userRole: string): number {
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

export function canRoleActOnPoe(userRole: string, status: string): boolean {
  if (userRole === 'SDP Admin') {
    return !['MODERATION_COMPLETE'].includes(status);
  }
  if (userRole === 'Learner') {
    return status === 'ISSUED_TO_LEARNER';
  }
  if (userRole === 'Facilitator') {
    return status === 'LEARNER_SUBMITTED';
  }
  if (userRole === 'Assessor') {
    return status === 'ALLOCATED_TO_ASSESSOR';
  }
  if (userRole === 'Moderator') {
    return status === 'SUBMITTED_TO_MODERATOR';
  }
  return false;
}

export function poeKindLabel(kind: string): string {
  switch (kind) {
    case 'WORKBOOK':
      return 'Learner workbook';
    case 'SUMMATIVE':
      return 'Summative assessment';
    case 'LEARNER_GUIDE':
      return 'Learner guide';
    default:
      return kind;
  }
}
