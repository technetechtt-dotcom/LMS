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
});
