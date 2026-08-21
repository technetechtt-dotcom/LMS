import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

/** Pure transition table tests (mirrors PoeWorkflowService rules). */
const TRANSITIONS: Record<
  string,
  { from: string[]; to: string; roles: string[] }
> = {
  issue: { from: ['DRAFT'], to: 'ISSUED_TO_LEARNER', roles: ['ADMIN', 'FACILITATOR'] },
  submit: {
    from: ['ISSUED_TO_LEARNER'],
    to: 'LEARNER_SUBMITTED',
    roles: ['LEARNER', 'ADMIN', 'FACILITATOR'],
  },
  facilitator_mark: {
    from: ['LEARNER_SUBMITTED'],
    to: 'FACILITATOR_MARKED',
    roles: ['ADMIN', 'FACILITATOR'],
  },
  moderate_approve: {
    from: ['SUBMITTED_TO_MODERATOR'],
    to: 'MODERATION_COMPLETE',
    roles: ['ADMIN', 'MODERATOR'],
  },
};

function canTransition(
  status: string,
  action: string,
  roleCodes: string[],
): string {
  const rule = TRANSITIONS[action];
  if (!rule) throw new BadRequestException('unknown');
  if (!rule.roles.some((r) => roleCodes.includes(r))) {
    throw new ForbiddenException('role');
  }
  if (!rule.from.includes(status)) {
    throw new BadRequestException('status');
  }
  return rule.to;
}

describe('PoE state machine', () => {
  it('allows facilitator to issue from DRAFT', () => {
    expect(canTransition('DRAFT', 'issue', ['FACILITATOR'])).toBe(
      'ISSUED_TO_LEARNER',
    );
  });

  it('blocks learner from issuing', () => {
    expect(() => canTransition('DRAFT', 'issue', ['LEARNER'])).toThrow(
      ForbiddenException,
    );
  });

  it('blocks submit from DRAFT', () => {
    expect(() =>
      canTransition('DRAFT', 'submit', ['LEARNER']),
    ).toThrow(BadRequestException);
  });

  it('allows learner submit after issue', () => {
    expect(
      canTransition('ISSUED_TO_LEARNER', 'submit', ['LEARNER']),
    ).toBe('LEARNER_SUBMITTED');
  });
});
