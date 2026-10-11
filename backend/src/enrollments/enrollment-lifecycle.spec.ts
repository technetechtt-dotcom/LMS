import { resolveEnrollmentTransition } from './enrollment-lifecycle';
import { BadRequestException } from '@nestjs/common';

describe('enrollment lifecycle state machine', () => {
  it('derives TRAINING from START_TRAINING', () => {
    expect(resolveEnrollmentTransition('ENROLLED', 'START_TRAINING')).toBe(
      'TRAINING',
    );
  });

  it('rejects illegal transitions', () => {
    expect(() =>
      resolveEnrollmentTransition('ENROLLED', 'COMPLETE_ENROLLMENT'),
    ).toThrow(BadRequestException);
  });

  it('rejects client toState that disagrees with action', () => {
    expect(() =>
      resolveEnrollmentTransition('ENROLLED', 'START_TRAINING', 'COMPLETED'),
    ).toThrow(BadRequestException);
  });

  it('supports suspend, withdraw, reject, cancel and reinstate', () => {
    expect(resolveEnrollmentTransition('TRAINING', 'SUSPEND')).toBe('SUSPENDED');
    expect(resolveEnrollmentTransition('SUSPENDED', 'WITHDRAW')).toBe('WITHDRAWN');
    expect(resolveEnrollmentTransition('ASSESSMENT', 'REJECT')).toBe('REJECTED');
    expect(resolveEnrollmentTransition('ENROLLED', 'CANCEL')).toBe('CANCELLED');
    expect(resolveEnrollmentTransition('WITHDRAWN', 'REINSTATE')).toBe('ENROLLED');
  });
});
