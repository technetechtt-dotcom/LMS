import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { POE_TRANSITIONS } from './poe-workflow.service';

function canTransition(
  status: string,
  action: keyof typeof POE_TRANSITIONS,
  roleCodes: string[],
): string {
  const rule = POE_TRANSITIONS[action];
  if (!rule) throw new BadRequestException('unknown');
  if (!rule.roles.some((r) => roleCodes.includes(r))) {
    throw new ForbiddenException('role');
  }
  if (!rule.from.includes(status as never)) {
    throw new BadRequestException('status');
  }
  return rule.to;
}

describe('PoE state machine (real transition table)', () => {
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
    expect(() => canTransition('DRAFT', 'submit', ['LEARNER'])).toThrow(
      BadRequestException,
    );
  });

  it('allows learner submit after issue', () => {
    expect(
      canTransition('ISSUED_TO_LEARNER', 'submit', ['LEARNER']),
    ).toBe('LEARNER_SUBMITTED');
  });

  it('requires assessor role for assessor_mark', () => {
    expect(() =>
      canTransition('ALLOCATED_TO_ASSESSOR', 'assessor_mark', ['FACILITATOR']),
    ).toThrow(ForbiddenException);
  });
});
