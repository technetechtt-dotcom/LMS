import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { POE_TRANSITIONS, PoeWorkflowService } from './poe-workflow.service';

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

describe('PoE moderation allocation enforcement', () => {
  const baseArtifact = {
    id: 'artifact-1',
    status: 'SUBMITTED_TO_MODERATOR',
    moderatorId: 'moderator-allocated',
    enrollment: { learnerId: 'learner-1' },
  };

  it('does not let an organisation admin bypass the assigned moderator', async () => {
    const update = jest.fn();
    const service = new PoeWorkflowService(
      {
        poeLearningArtifact: {
          findFirst: jest.fn().mockResolvedValue(baseArtifact),
          update,
        },
      } as never,
      {} as never,
    );

    await expect(
      service.transition(
        'artifact-1',
        'moderate_approve',
        {},
        {
          userId: 'admin-1',
          email: 'admin@example.com',
          organisationId: 'organisation-1',
          roleCodes: ['ADMIN'],
        },
      ),
    ).rejects.toThrow('allocated moderator');
    expect(update).not.toHaveBeenCalled();
  });

  it('allows the exact assigned moderator at the authoritative stage', async () => {
    const updated = {
      ...baseArtifact,
      status: 'MODERATION_COMPLETE',
      moderationOutcome: 'APPROVED',
    };
    const update = jest.fn().mockResolvedValue(updated);
    const auditCreate = jest.fn().mockResolvedValue({});
    const service = new PoeWorkflowService(
      {
        poeLearningArtifact: {
          findFirst: jest.fn().mockResolvedValue(baseArtifact),
          update,
        },
        auditLog: { create: auditCreate },
      } as never,
      {} as never,
    );

    await expect(
      service.transition(
        'artifact-1',
        'moderate_approve',
        { feedback: 'Evidence sampled' },
        {
          userId: 'moderator-allocated',
          email: 'moderator@example.com',
          organisationId: 'organisation-1',
          roleCodes: ['MODERATOR'],
        },
      ),
    ).resolves.toEqual(updated);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'MODERATION_COMPLETE',
          moderationOutcome: 'APPROVED',
        }),
      }),
    );
    expect(auditCreate).toHaveBeenCalled();
  });

  it('rejects moderation before submission to the moderator', async () => {
    const service = new PoeWorkflowService(
      {
        poeLearningArtifact: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseArtifact,
            status: 'ASSESSOR_SATISFACTORY',
          }),
        },
      } as never,
      {} as never,
    );

    await expect(
      service.transition(
        'artifact-1',
        'moderate_reject',
        {},
        {
          userId: 'moderator-allocated',
          email: 'moderator@example.com',
          organisationId: 'organisation-1',
          roleCodes: ['MODERATOR'],
        },
      ),
    ).rejects.toThrow('Cannot moderate_reject');
  });
});
