import { BadRequestException } from '@nestjs/common';
import {
  LearnerLifecycleStatus,
  WorkflowAction,
} from '@prisma/client';

/** Canonical enrollment lifecycle: action → expected next state. */
export const ENROLLMENT_TRANSITIONS: Record<
  WorkflowAction,
  { from: LearnerLifecycleStatus[]; to: LearnerLifecycleStatus }
> = {
  START_TRAINING: { from: ['ENROLLED'], to: 'TRAINING' },
  MOVE_TO_WORKPLACE: { from: ['TRAINING'], to: 'WORKPLACE' },
  START_ASSESSMENT: { from: ['WORKPLACE', 'TRAINING'], to: 'ASSESSMENT' },
  SUBMIT_FOR_MODERATION: { from: ['ASSESSMENT'], to: 'MODERATION' },
  COMPLETE_ENROLLMENT: { from: ['MODERATION', 'ASSESSMENT'], to: 'COMPLETED' },
  SUSPEND: {
    from: ['ENROLLED', 'TRAINING', 'WORKPLACE', 'ASSESSMENT', 'MODERATION'],
    to: 'SUSPENDED',
  },
  WITHDRAW: {
    from: ['ENROLLED', 'TRAINING', 'WORKPLACE', 'ASSESSMENT', 'MODERATION', 'SUSPENDED'],
    to: 'WITHDRAWN',
  },
  REJECT: {
    from: ['ENROLLED', 'TRAINING', 'ASSESSMENT', 'MODERATION'],
    to: 'REJECTED',
  },
  CANCEL: {
    from: ['ENROLLED', 'TRAINING', 'WORKPLACE', 'ASSESSMENT', 'MODERATION', 'SUSPENDED'],
    to: 'CANCELLED',
  },
  REINSTATE: {
    from: ['SUSPENDED', 'WITHDRAWN', 'REJECTED', 'CANCELLED'],
    to: 'ENROLLED',
  },
  REOPEN: {
    from: [
      'COMPLETED',
      'MODERATION',
      'ASSESSMENT',
      'WORKPLACE',
      'TRAINING',
      'SUSPENDED',
      'WITHDRAWN',
      'REJECTED',
      'CANCELLED',
    ],
    to: 'ENROLLED',
  },
};

export function resolveEnrollmentTransition(
  current: LearnerLifecycleStatus,
  action: WorkflowAction,
  clientToState?: LearnerLifecycleStatus,
): LearnerLifecycleStatus {
  const rule = ENROLLMENT_TRANSITIONS[action];
  if (!rule) {
    throw new BadRequestException(`Unknown workflow action: ${action}`);
  }
  if (!rule.from.includes(current)) {
    throw new BadRequestException(
      `Cannot ${action} from status ${current}`,
    );
  }
  if (clientToState && clientToState !== rule.to) {
    throw new BadRequestException(
      `Action ${action} must transition to ${rule.to}, not ${clientToState}`,
    );
  }
  return rule.to;
}
