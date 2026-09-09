import { CompletionGateService } from './completion-gate.service';

describe('CompletionGateService authoritative completion decisions', () => {
  const enrollment = (requirements: Record<string, unknown> = {}) => ({
    id: 'enrollment-1',
    programmeId: 'programme-1',
    learner: { isActive: true, deletedAt: null },
    programme: { deletedAt: null, metadata: { completionRequirements: requirements } },
  });

  function setup(input: {
    enrollment?: unknown;
    assessments?: unknown[];
    moderated?: unknown[];
    poe?: Record<string, unknown>;
    blocking?: number;
    hours?: number;
    sessionCounts?: number[];
    attendanceRows?: unknown[][];
    objectMissing?: boolean;
  } = {}) {
    const poe = input.poe ?? {
      WORKBOOK: { uploads: [{ uploadId: 'workbook-upload' }] },
      SUMMATIVE: { uploads: [{ uploadId: 'summative-upload' }] },
    };
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue(
          Object.prototype.hasOwnProperty.call(input, 'enrollment')
            ? input.enrollment
            : enrollment(),
        ),
      },
      assessment: {
        findMany: jest.fn().mockImplementation((query) => Promise.resolve(
          query?.select?.moderation
            ? (input.moderated ?? [{ moderation: [{ decision: 'APPROVED' }] }])
            : (input.assessments ?? [{ result: 'C' }]),
        )),
      },
      poeLearningArtifact: {
        findFirst: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(poe[String(where.kind)] ?? null)),
      },
      complianceDecision: {
        count: jest.fn().mockResolvedValue(input.blocking ?? 0),
      },
      attendanceSession: {
        count: jest.fn()
          .mockResolvedValueOnce(input.sessionCounts?.[0] ?? 0)
          .mockResolvedValueOnce(input.sessionCounts?.[1] ?? 0),
      },
      attendance: {
        findMany: jest.fn(),
      },
    };
    for (const rows of input.attendanceRows ?? []) {
      prisma.attendance.findMany.mockResolvedValueOnce(rows);
    }
    const workplace = {
      verifiedHours: jest.fn().mockResolvedValue(input.hours ?? 0),
    };
    const files = {
      assertUploadAvailable: input.objectMissing
        ? jest.fn().mockRejectedValue(new Error('missing'))
        : jest.fn().mockResolvedValue(undefined),
    };
    return {
      service: new CompletionGateService(
        prisma as never,
        workplace as never,
        files as never,
      ),
      prisma,
      workplace,
      files,
    };
  }

  it('fails closed when the enrollment is outside the tenant or missing', async () => {
    const { service } = setup({ enrollment: null });
    await expect(service.evaluate('missing', 'organisation-1')).resolves.toEqual({
      ready: false,
      reasons: ['Enrollment not found'],
      checks: {},
    });
  });

  it('passes only with competent assessments, approved moderation and live PoE objects', async () => {
    const configured = enrollment({
      minVerifiedWorkplaceHours: 40,
      minAttendanceRatePercent: 75,
    });
    const { service, files } = setup({
      enrollment: configured,
      hours: 45,
      sessionCounts: [0, 4],
      attendanceRows: [
        [{ sessionId: '1' }, { sessionId: '2' }, { sessionId: '3' }],
        [],
      ],
    });
    const result = await service.evaluate('enrollment-1', 'organisation-1');
    expect(result.ready).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.checks).toEqual(expect.objectContaining({
      learnerAndProgrammeValid: true,
      allAssessmentsCompetent: true,
      poe_workbook_approved: true,
      poe_summative_approved: true,
      requiredModerationApproved: true,
      noBlockingComplianceDecision: true,
      verifiedWorkplaceHours: true,
      mandatoryAttendanceSessionsClosed: true,
      attendanceRate: true,
    }));
    expect(files.assertUploadAvailable).toHaveBeenCalledTimes(2);
  });

  it('reports every blocking competency, evidence, compliance, hours and attendance reason', async () => {
    const configured = enrollment({
      minVerifiedWorkplaceHours: 100,
      minAttendanceRatePercent: 80,
    });
    (configured.learner as { isActive: boolean }).isActive = false;
    const { service } = setup({
      enrollment: configured,
      assessments: [{ result: 'NYC' }],
      moderated: [{ moderation: [{ decision: 'REJECTED' }] }],
      poe: {},
      blocking: 1,
      hours: 10,
      sessionCounts: [1, 0],
      attendanceRows: [[
        { status: 'PRESENT' },
        { status: 'ABSENT' },
        { status: 'EXCUSED' },
      ]],
    });
    const result = await service.evaluate('enrollment-1', 'organisation-1');
    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'Learner or programme record is inactive',
      'Not all assessments are Competent (C)',
      'Missing approved WORKBOOK PoE artefact',
      'Missing approved SUMMATIVE PoE artefact',
      'Required assessment moderation is not approved',
      'A blocking compliance decision is unresolved',
      'Verified workplace hours 10 < required 100',
      'Mandatory attendance sessions remain open',
      'Attendance rate 50% < required 80%',
    ]));
  });

  it('fails when a once-verified PoE object is no longer present', async () => {
    const { service } = setup({ objectMissing: true });
    const result = await service.evaluate('enrollment-1', 'organisation-1');
    expect(result.ready).toBe(false);
    expect(result.reasons).toContain('WORKBOOK PoE evidence object is unavailable');
  });

  it('honours programme configuration that makes assessment and PoE gates optional', async () => {
    const { service, prisma } = setup({
      enrollment: enrollment({
        requireAllAssessmentsC: false,
        requireWorkbook: false,
        requireSummative: false,
      }),
      moderated: [],
    });
    const result = await service.evaluate('enrollment-1', 'organisation-1');
    expect(result.ready).toBe(true);
    expect(prisma.poeLearningArtifact.findFirst).not.toHaveBeenCalled();
  });
});
