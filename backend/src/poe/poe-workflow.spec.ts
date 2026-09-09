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
        poeArtifactUpload: {
          findMany: jest.fn().mockResolvedValue([{ uploadId: 'upload-1' }]),
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
        poeArtifactUpload: {
          findMany: jest.fn().mockResolvedValue([{ uploadId: 'upload-1' }]),
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
        poeArtifactUpload: {
          findMany: jest.fn().mockResolvedValue([{ uploadId: 'upload-1' }]),
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

describe('PoeWorkflowService authoritative transition execution', () => {
  const actor = (userId: string, roleCodes: string[]) => ({
    userId,
    email: `${userId}@example.test`,
    organisationId: 'organisation-1',
    roleCodes,
  });

  function setup(status = 'DRAFT', overrides: Record<string, unknown> = {}) {
    const artifact = {
      id: 'artifact-1',
      kind: 'WORKBOOK',
      title: 'Workbook',
      status,
      assessorId: 'assessor-1',
      moderatorId: 'moderator-1',
      enrollmentId: 'enrollment-1',
      enrollment: { learnerId: 'learner-1' },
      ...overrides,
    };
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'enrollment-1', learnerId: 'learner-1' }),
      },
      userOrganisation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-1', role: { code: 'ASSESSOR' } }),
      },
      poeArtifactUpload: {
        findMany: jest.fn().mockResolvedValue([{ uploadId: 'upload-1' }]),
      },
      poeLearningArtifact: {
        findFirst: jest.fn().mockResolvedValue(artifact),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'created', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...artifact, ...data })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const completion = { evaluate: jest.fn().mockResolvedValue({ ready: true, reasons: [] }) };
    const files = { assertUploadAvailable: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new PoeWorkflowService(prisma as never, completion as never, files as never),
      prisma,
      completion,
      files,
    };
  }

  it.each([
    ['issue', 'DRAFT', actor('facilitator-1', ['FACILITATOR']), {}, 'ISSUED_TO_LEARNER'],
    ['submit', 'ISSUED_TO_LEARNER', actor('learner-1', ['LEARNER']), {}, 'LEARNER_SUBMITTED'],
    ['facilitator_mark', 'LEARNER_SUBMITTED', actor('facilitator-1', ['FACILITATOR']), { feedback: 'marked' }, 'FACILITATOR_MARKED'],
    ['allocate_assessor', 'FACILITATOR_MARKED', actor('facilitator-1', ['FACILITATOR']), { assessorId: 'assessor-1' }, 'ALLOCATED_TO_ASSESSOR'],
    ['assessor_mark', 'ALLOCATED_TO_ASSESSOR', actor('assessor-1', ['ASSESSOR']), { feedback: 'competent' }, 'ASSESSOR_SATISFACTORY'],
    ['submit_moderation', 'ASSESSOR_SATISFACTORY', actor('assessor-1', ['ASSESSOR']), { moderatorId: 'moderator-1' }, 'SUBMITTED_TO_MODERATOR'],
    ['moderate_approve', 'SUBMITTED_TO_MODERATOR', actor('moderator-1', ['MODERATOR']), { feedback: 'approved' }, 'MODERATION_COMPLETE'],
    ['moderate_reject', 'SUBMITTED_TO_MODERATOR', actor('moderator-1', ['MODERATOR']), { feedback: 'correct' }, 'MODERATION_COMPLETE'],
  ] as const)(
    'executes %s only from its authoritative state',
    async (action, status, user, body, expected) => {
      const { service, prisma, files } = setup(status);
      const result = await service.transition('artifact-1', action, body, user);
      expect(result.status).toBe(expected);
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(files.assertUploadAvailable).toHaveBeenCalledTimes(action === 'issue' ? 0 : 1);
    },
  );

  it('rejects missing verified evidence and unavailable evidence objects', async () => {
    const missing = setup('ISSUED_TO_LEARNER');
    missing.prisma.poeArtifactUpload.findMany.mockResolvedValue([]);
    await expect(missing.service.transition(
      'artifact-1',
      'submit',
      {},
      actor('learner-1', ['LEARNER']),
    )).rejects.toThrow('verified evidence');

    const unavailable = setup('ISSUED_TO_LEARNER');
    unavailable.files.assertUploadAvailable.mockRejectedValue(new Error('missing object'));
    await expect(unavailable.service.transition(
      'artifact-1',
      'submit',
      {},
      actor('learner-1', ['LEARNER']),
    )).rejects.toThrow('missing object');
  });

  it('rejects missing allocations and users outside the active organisation', async () => {
    const assessor = setup('FACILITATOR_MARKED');
    await expect(assessor.service.transition(
      'artifact-1',
      'allocate_assessor',
      {},
      actor('facilitator-1', ['FACILITATOR']),
    )).rejects.toThrow('assessorId is required');
    assessor.prisma.userOrganisation.findFirst.mockResolvedValue(null);
    await expect(assessor.service.transition(
      'artifact-1',
      'allocate_assessor',
      { assessorId: 'foreign-assessor' },
      actor('facilitator-1', ['FACILITATOR']),
    )).rejects.toThrow('active ASSESSOR/ADMIN');

    const moderator = setup('ASSESSOR_SATISFACTORY');
    await expect(moderator.service.transition(
      'artifact-1',
      'submit_moderation',
      {},
      actor('assessor-1', ['ASSESSOR']),
    )).rejects.toThrow('moderatorId is required');
  });

  it('does not let an unallocated assessor mark or submit for moderation', async () => {
    const mark = setup('ALLOCATED_TO_ASSESSOR');
    await expect(mark.service.transition(
      'artifact-1',
      'assessor_mark',
      {},
      actor('other-assessor', ['ASSESSOR']),
    )).rejects.toThrow('allocated assessor');

    const submit = setup('ASSESSOR_SATISFACTORY');
    await expect(submit.service.transition(
      'artifact-1',
      'submit_moderation',
      { moderatorId: 'moderator-1' },
      actor('other-assessor', ['ASSESSOR']),
    )).rejects.toThrow('allocated assessor');
  });

  it('creates, lists and maps only tenant-scoped artifacts', async () => {
    const { service, prisma } = setup();
    await expect(service.create({
      enrollmentId: 'enrollment-1',
      kind: 'WORKBOOK',
      title: 'Workbook',
    }, actor('facilitator-1', ['FACILITATOR']))).resolves.toEqual(
      expect.objectContaining({ id: 'created', status: 'DRAFT' }),
    );

    prisma.poeLearningArtifact.findMany.mockResolvedValueOnce([{ id: 'artifact-1' }]);
    await expect(service.list('enrollment-1', actor('learner-1', ['LEARNER'])))
      .resolves.toEqual([{ id: 'artifact-1' }]);

    prisma.poeLearningArtifact.findFirst.mockResolvedValueOnce({
      id: 'artifact-1',
      kind: 'WORKBOOK',
      title: 'Workbook',
      description: null,
      status: 'LEARNER_SUBMITTED',
      enrollmentId: 'enrollment-1',
      facilitatorFeedback: null,
      assessorFeedback: null,
      moderatorFeedback: null,
      moderationOutcome: null,
      assessorId: 'assessor-1',
      moderatorId: 'moderator-1',
      facilitatorMarkedAt: null,
      assessorMarkedAt: null,
      moderatedAt: null,
      url: null,
      uploads: [{ upload: { status: 'VERIFIED', storageKey: 'poe/org/id.pdf' } }],
      enrollment: {
        learnerId: 'learner-1',
        learner: { firstName: 'Ada', lastName: 'Lovelace' },
        programme: { id: 'programme-1', title: 'Systems' },
      },
    });
    await expect(service.byId('artifact-1', actor('learner-1', ['LEARNER'])))
      .resolves.toEqual(expect.objectContaining({
        learnerName: 'Ada Lovelace',
        evidenceCount: 1,
        evidenceVerified: true,
      }));
  });

  it('scopes queues to assigned assessors and moderators and maps names', async () => {
    const { service, prisma } = setup();
    prisma.poeLearningArtifact.findMany.mockResolvedValue([{
      id: 'artifact-1',
      kind: 'WORKBOOK',
      title: 'Workbook',
      status: 'ALLOCATED_TO_ASSESSOR',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      enrollment: {
        id: 'enrollment-1',
        learner: { firstName: 'Ada', lastName: 'Lovelace' },
        programme: { id: 'programme-1', title: 'Systems' },
      },
    }]);
    await expect(service.listQueue('assessor', actor('assessor-1', ['ASSESSOR'])))
      .resolves.toEqual([expect.objectContaining({ learnerName: 'Ada Lovelace' })]);
    expect(prisma.poeLearningArtifact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assessorId: 'assessor-1' }) }),
    );
    await service.listQueue('moderator', actor('admin-1', ['ADMIN']));
    expect(prisma.poeLearningArtifact.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ moderatorId: expect.anything() }) }),
    );
  });

  it('combines lifecycle and configured completion gates for credentials', async () => {
    const { service, prisma, completion } = setup();
    prisma.enrollment.findFirst.mockResolvedValueOnce(null);
    await expect(service.enrollmentReadyForCertificate('missing')).resolves.toEqual({
      ready: false,
      reasons: ['Enrollment not found'],
    });
    prisma.enrollment.findFirst.mockResolvedValueOnce({
      id: 'enrollment-1', status: 'ASSESSMENT', sdioOrganisationId: 'organisation-1',
    });
    completion.evaluate.mockResolvedValueOnce({ ready: false, reasons: ['PoE incomplete'] });
    await expect(service.enrollmentReadyForCertificate('enrollment-1')).resolves.toEqual({
      ready: false,
      reasons: ['Enrolment lifecycle is not COMPLETED', 'PoE incomplete'],
    });
  });
});
