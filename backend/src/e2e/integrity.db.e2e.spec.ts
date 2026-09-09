/**
 * Database-backed integrity E2E. Runs only when RUN_DB_E2E=1 (CI postgres).
 */
import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { AssessmentInstancesService } from '../assessment-instances/assessment-instances.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CompletionGateService } from '../enrollments/completion-gate.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { InvitationsService } from '../invitations/invitations.service';
import { WorkplaceLogsService } from '../workplace-logs/workplace-logs.service';
import { UsersService } from '../users/users.service';
import { PoeWorkflowService } from '../poe/poe-workflow.service';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
} from '../common/crypto/token-crypto';
import type { AuthUser } from '../common/types/request-with-user';

jest.setTimeout(60_000);

const dbE2e = process.env.RUN_DB_E2E === '1' && Boolean(process.env.DATABASE_URL);

describe('integrity DB E2E', () => {
  if (!dbE2e) {
    it('skipped without RUN_DB_E2E + DATABASE_URL', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const prisma = new PrismaService();
  const assessments = new AssessmentsService(prisma);
  const instances = new AssessmentInstancesService(prisma);
  const attendance = new AttendanceService(prisma);
  const workplace = new WorkplaceLogsService(prisma);
  const completion = new CompletionGateService(prisma, workplace);
  const enrollments = new EnrollmentsService(prisma, completion);
  const poeWorkflow = new PoeWorkflowService(
    prisma,
    completion,
    { assertUploadAvailable: jest.fn().mockResolvedValue(undefined) } as never,
  );
  const invitations = new InvitationsService(
    prisma,
    { sendPasswordReset: jest.fn() } as never,
    { get: jest.fn() } as never,
  );
  const activationMail = { sendActivation: jest.fn().mockResolvedValue(undefined) };
  const users = new UsersService(
    prisma,
    activationMail as never,
    {
      get: jest.fn((key: string) =>
        key === 'ACTIVATION_TTL_HOURS'
          ? '24'
          : key === 'FRONTEND_ORIGIN'
            ? 'http://localhost:5173'
            : 'test',
      ),
    } as never,
  );

  const suffix = randomUUID().slice(0, 8);
  let orgA: string;
  let orgB: string;
  let learnerId: string;
  let assessorId: string;
  let facilitatorId: string;
  let otherAssessorId: string;
  let moderatorId: string;
  let adminId: string;
  let enrollmentId: string;
  let otherProgrammeEnrollmentId: string;
  let foreignEnrollmentId: string;
  let assessmentId: string;
  let submissionId: string;
  let questionId: string;
  let instrumentId: string;
  let programmeId: string;
  let unitStandardId: string;
  let roleLearnerId: string;
  let invitedById: string;

  const asFacilitator = (): AuthUser => ({
    userId: facilitatorId,
    email: `facilitator-${suffix}@e2e.test`,
    organisationId: orgA,
    roleCodes: ['FACILITATOR'],
  });
  const asAssessor = (): AuthUser => ({
    userId: assessorId,
    email: `assessor-${suffix}@e2e.test`,
    organisationId: orgA,
    roleCodes: ['ASSESSOR'],
  });
  const asOtherAssessor = (): AuthUser => ({
    userId: otherAssessorId,
    email: `other-${suffix}@e2e.test`,
    organisationId: orgA,
    roleCodes: ['ASSESSOR'],
  });
  const asAdmin = (): AuthUser => ({
    userId: adminId,
    email: `admin-${suffix}@e2e.test`,
    organisationId: orgA,
    roleCodes: ['ADMIN'],
  });
  const asModerator = (): AuthUser => ({
    userId: moderatorId,
    email: `mod-${suffix}@e2e.test`,
    organisationId: orgA,
    roleCodes: ['MODERATOR'],
  });
  const asLearner = (): AuthUser => ({
    userId: learnerId,
    email: `learner-${suffix}@e2e.test`,
    organisationId: orgA,
    roleCodes: ['LEARNER'],
  });
  const asAdminB = (): AuthUser => ({
    userId: adminId,
    email: `admin-${suffix}@e2e.test`,
    organisationId: orgB,
    roleCodes: ['ADMIN'],
  });

  beforeAll(async () => {
    await prisma.$connect();
    const role = async (code: string) =>
      prisma.role.upsert({
        where: { code },
        update: {},
        create: { code, name: code },
      });
    const [rLearner, rAssessor, rFacilitator, rAdmin, rMod] = await Promise.all([
      role('LEARNER'),
      role('ASSESSOR'),
      role('FACILITATOR'),
      role('ADMIN'),
      role('MODERATOR'),
    ]);
    roleLearnerId = rLearner.id;

    const org1 = await prisma.organisation.create({
      data: { name: `E2E A ${suffix}`, type: 'SDIO' },
    });
    const org2 = await prisma.organisation.create({
      data: { name: `E2E B ${suffix}`, type: 'SDIO' },
    });
    orgA = org1.id;
    orgB = org2.id;

    const mkUser = (email: string) =>
      prisma.user.create({
        data: {
          email,
          passwordHash: 'hash',
          firstName: 'E2E',
          lastName: email.split('@')[0],
        },
      });

    const [learner, assessor, facilitator, other, moderator, admin] = await Promise.all([
      mkUser(`learner-${suffix}@e2e.test`),
      mkUser(`assessor-${suffix}@e2e.test`),
      mkUser(`facilitator-${suffix}@e2e.test`),
      mkUser(`other-${suffix}@e2e.test`),
      mkUser(`mod-${suffix}@e2e.test`),
      mkUser(`admin-${suffix}@e2e.test`),
    ]);
    learnerId = learner.id;
    assessorId = assessor.id;
    facilitatorId = facilitator.id;
    otherAssessorId = other.id;
    moderatorId = moderator.id;
    adminId = admin.id;
    invitedById = admin.id;

    await prisma.userOrganisation.createMany({
      data: [
        { userId: learner.id, roleId: rLearner.id, organisationId: orgA },
        { userId: assessor.id, roleId: rAssessor.id, organisationId: orgA },
        { userId: facilitator.id, roleId: rFacilitator.id, organisationId: orgA },
        { userId: other.id, roleId: rAssessor.id, organisationId: orgA },
        { userId: moderator.id, roleId: rMod.id, organisationId: orgA },
        { userId: admin.id, roleId: rAdmin.id, organisationId: orgA },
      ],
    });

    const qual = await prisma.qualification.create({
      data: {
        saqaId: `E2E-${suffix}`,
        title: 'E2E Qual',
        nqfLevel: 4,
        totalCredits: 10,
      },
    });
    const unit = await prisma.unitStandard.create({
      data: {
        code: `US-${suffix}`,
        title: 'Essay unit',
        credits: 5,
        level: 4,
        qualificationId: qual.id,
      },
    });
    unitStandardId = unit.id;
    const instrument = await prisma.assessmentInstrument.create({
      data: {
        organisationId: orgA,
        unitStandardId: unit.id,
        version: 1,
        title: 'Inst',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        maxAttempts: 3,
      },
    });
    instrumentId = instrument.id;
    const question = await prisma.assessmentQuestion.create({
      data: {
        unitStandardId: unit.id,
        instrumentId: instrument.id,
        orderIndex: 1,
        prompt: 'Explain',
        questionType: 'long_answer',
        points: 10,
      },
    });
    questionId = question.id;

    const programme = await prisma.programme.create({
      data: {
        organisationId: orgA,
        qualificationId: qual.id,
        code: `P-${suffix}`,
        title: 'Prog A',
        metadata: {
          completionRequirements: {
            requireAllAssessmentsC: false,
            requireWorkbook: false,
            requireSummative: false,
            minVerifiedWorkplaceHours: 0,
            minAttendanceRatePercent: 80,
          },
        },
      },
    });
    programmeId = programme.id;
    const otherProg = await prisma.programme.create({
      data: {
        organisationId: orgA,
        qualificationId: qual.id,
        code: `P2-${suffix}`,
        title: 'Prog other',
      },
    });
    const foreignProg = await prisma.programme.create({
      data: {
        organisationId: orgB,
        qualificationId: qual.id,
        code: `PB-${suffix}`,
        title: 'Prog B',
      },
    });

    const enr = await prisma.enrollment.create({
      data: {
        learnerId,
        programmeId: programme.id,
        sdioOrganisationId: orgA,
      },
    });
    enrollmentId = enr.id;
    const enrOther = await prisma.enrollment.create({
      data: {
        learnerId,
        programmeId: otherProg.id,
        sdioOrganisationId: orgA,
      },
    });
    otherProgrammeEnrollmentId = enrOther.id;
    const foreignLearner = await prisma.user.create({
      data: {
        email: `foreign-${suffix}@e2e.test`,
        passwordHash: 'hash',
        firstName: 'F',
        lastName: 'L',
      },
    });
    const foreignEnr = await prisma.enrollment.create({
      data: {
        learnerId: foreignLearner.id,
        programmeId: foreignProg.id,
        sdioOrganisationId: orgB,
      },
    });
    foreignEnrollmentId = foreignEnr.id;

    const assessment = await prisma.assessment.create({
      data: {
        enrollmentId,
        unitStandardId: unit.id,
        assessorId,
        moderatorId,
        result: 'PENDING',
      },
    });
    assessmentId = assessment.id;
    const submission = await prisma.assessmentSubmission.create({
      data: {
        enrollmentId,
        assessmentId: assessment.id,
        instrumentId: instrument.id,
        attemptNumber: 1,
        status: 'submitted',
        submittedAt: new Date(),
        responses: [{ questionId: question.id, answer: 'essay' }],
      },
    });
    submissionId = submission.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ignores result on generic Assessment PATCH', async () => {
    await assessments.update(
      assessmentId,
      { feedback: 'note', result: 'C' } as never,
      asAssessor(),
    );
    const row = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
    });
    expect(row.result).toBe('PENDING');
    expect(row.feedback).toBe('note');
  });

  it('enforces allocated assessor on human grading', async () => {
    await expect(
      instances.humanGrade(
        submissionId,
        [{ questionId, score: 4 }],
        asAssessor(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await instances.humanGrade(
      submissionId,
      [{ questionId, score: 6 }],
      asFacilitator(),
    );
    await instances.completeFacilitatorGrading(submissionId, asFacilitator());

    await expect(
      instances.humanGrade(
        submissionId,
        [{ questionId, score: 4 }],
        asOtherAssessor(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects human score above question points and ignores client maxScore', async () => {
    const fresh = await prisma.assessmentSubmission.create({
      data: {
        enrollmentId,
        assessmentId,
        instrumentId,
        attemptNumber: 2,
        status: 'submitted',
        submittedAt: new Date(),
        responses: [{ questionId, answer: 'essay' }],
      },
    });

    await expect(
      instances.humanGrade(
        fresh.id,
        [{ questionId, score: 99, maxScore: 100 } as never],
        asFacilitator(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const graded = await instances.humanGrade(
      fresh.id,
      [{ questionId, score: 7 }],
      asFacilitator(),
    );
    expect(graded.score).toBe(7);
    const stored = await prisma.assessmentSubmission.findUniqueOrThrow({
      where: { id: fresh.id },
    });
    const responses = stored.responses as Array<{ maxScore: number; score: number }>;
    expect(responses[0].maxScore).toBe(10);
    expect(responses[0].score).toBe(7);
  });

  it('follows facilitator → assessor → moderator workflow; rejection clears competency to NYC', async () => {
    const row = await prisma.assessmentSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });
    expect(row.status).toBe('facilitator_graded');

    await instances.humanGrade(
      submissionId,
      [{ questionId, score: 8 }],
      asAssessor(),
    );
    await instances.completeGrading(submissionId, asAssessor());
    const finalised = await assessments.finaliseResult(
      assessmentId,
      { result: 'C', feedback: 'competent' },
      asAssessor(),
    );
    expect(finalised.result).toBe('C');

    await instances.moderate(submissionId, 'reject', 'sampling fail', asModerator());
    const after = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
    });
    expect(after.result).toBe('NYC');
    expect(after.assessorId).toBe(assessorId);
    const mod = await prisma.moderation.findFirst({
      where: { assessmentId },
      orderBy: { round: 'desc' },
    });
    expect(mod?.decision).toBe('REJECTED');
  });

  it('starts, saves, resumes and submits the same persisted learner attempt', async () => {
    const started = await assessments.startAttempt(assessmentId, asLearner());
    expect(started.status).toBe('in_progress');
    expect(started.attemptNumber).toBe(3);

    const saved = await instances.saveProgress(
      started.id,
      [{ questionId, questionType: 'long_answer', answer: 'saved draft', score: 999 }],
      asLearner(),
    );
    expect(saved.responses).toEqual([{
      questionId,
      questionType: 'long_answer',
      answer: 'saved draft',
    }]);

    const resumed = await assessments.startAttempt(assessmentId, asLearner());
    expect(resumed.id).toBe(started.id);
    expect(resumed.responses).toEqual(saved.responses);

    const submitted = await instances.submit({
      assessmentId,
      enrollmentId,
      responses: [{ questionId, questionType: 'long_answer', answer: 'final answer' }],
    }, asLearner());
    expect(submitted.id).toBe(started.id);
    expect(submitted.status).toBe('submitted');
    const stored = await prisma.assessmentSubmission.findUniqueOrThrow({
      where: { id: started.id },
    });
    expect(stored.submittedAt).toBeInstanceOf(Date);
  });

  it('persists the complete evidence-backed PoE role workflow and hides it from another tenant', async () => {
    const artifact = await poeWorkflow.create({
      enrollmentId,
      kind: 'WORKBOOK',
      title: 'E2E verified workbook',
    }, asFacilitator());
    const upload = await prisma.uploadRecord.create({
      data: {
        organisationId: orgA,
        uploadedById: learnerId,
        storageKey: `poe/${orgA}/${randomUUID()}.pdf`,
        originalName: 'workbook.pdf',
        mimeType: 'application/pdf',
        size: 100,
        sha256: 'a'.repeat(64),
        provider: 'e2e',
        status: 'VERIFIED',
        scanResult: 'e2e-clean',
        scannedAt: new Date(),
        verifiedAt: new Date(),
        retentionUntil: new Date(Date.now() + 86_400_000),
      },
    });
    await prisma.poeArtifactUpload.create({
      data: { artifactId: artifact.id, uploadId: upload.id, linkedById: learnerId },
    });

    await poeWorkflow.transition(artifact.id, 'issue', {}, asFacilitator());
    await poeWorkflow.transition(artifact.id, 'submit', {}, asLearner());
    await poeWorkflow.transition(
      artifact.id, 'facilitator_mark', { feedback: 'complete' }, asFacilitator(),
    );
    await poeWorkflow.transition(
      artifact.id, 'allocate_assessor', { assessorId }, asFacilitator(),
    );
    await poeWorkflow.transition(
      artifact.id, 'assessor_mark', { feedback: 'satisfactory' }, asAssessor(),
    );
    await poeWorkflow.transition(
      artifact.id, 'submit_moderation', { moderatorId }, asAssessor(),
    );
    const final = await poeWorkflow.transition(
      artifact.id, 'moderate_approve', { feedback: 'approved sample' }, asModerator(),
    );
    expect(final).toEqual(expect.objectContaining({
      status: 'MODERATION_COMPLETE', moderationOutcome: 'APPROVED',
    }));
    await expect(poeWorkflow.byId(artifact.id, asAdminB()))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('binds QR check-in to programme and rejects replay', async () => {
    const raw = generateOpaqueRefreshToken();
    const session = await prisma.attendanceSession.create({
      data: {
        organisationId: orgA,
        programmeId,
        openedById: adminId,
        tokenHash: hashOpaqueToken(raw),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });

    await expect(
      attendance.checkIn(session.id, raw, otherProgrammeEnrollmentId, asLearner()),
    ).rejects.toBeInstanceOf(BadRequestException);

    const first = await attendance.checkIn(
      session.id,
      raw,
      enrollmentId,
      asLearner(),
    );
    expect(first.sessionId).toBe(session.id);
    expect(first.status).toBe('PRESENT');

    await expect(
      attendance.checkIn(session.id, raw, enrollmentId, asLearner()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses scheduled-session count as attendance denominator', async () => {
    await prisma.attendanceSession.updateMany({
      where: { organisationId: orgA, programmeId },
      data: { closedAt: new Date(), scheduledAt: new Date(Date.now() - 60_000) },
    });
    await prisma.attendanceSession.create({
      data: {
        organisationId: orgA,
        programmeId,
        openedById: adminId,
        tokenHash: hashOpaqueToken(generateOpaqueRefreshToken()),
        expiresAt: new Date(Date.now() - 30 * 60_000),
        scheduledAt: new Date(Date.now() - 60_000),
        closedAt: new Date(),
      },
    });
    const gate = await completion.evaluate(enrollmentId, orgA);
    expect(gate.checks.attendanceRate).toBe(false);
    expect(gate.reasons.some((r) => r.includes('Attendance rate'))).toBe(true);
  });

  it('hides foreign-tenant completion status', async () => {
    await expect(
      enrollments.completionStatus(foreignEnrollmentId, asAdmin()),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      enrollments.completionStatus(enrollmentId, asAdminB()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registers from invitation atomically (no orphan user on mismatch)', async () => {
    const raw = generateOpaqueRefreshToken();
    await prisma.invitation.create({
      data: {
        organisationId: orgA,
        email: `invite-${suffix}@e2e.test`,
        roleId: roleLearnerId,
        tokenHash: hashOpaqueToken(raw),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86_400_000),
        invitedById,
      },
    });

    await expect(
      invitations.acceptAndCreateUser(raw, {
        email: 'wrong@e2e.test',
        passwordHash: 'hash',
        firstName: 'X',
        lastName: 'Y',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      await prisma.user.findUnique({ where: { email: 'wrong@e2e.test' } }),
    ).toBeNull();

    const created = await invitations.acceptAndCreateUser(raw, {
      email: `invite-${suffix}@e2e.test`,
      passwordHash: 'hash',
      firstName: 'Inv',
      lastName: 'Itee',
    });
    expect(created.email).toBe(`invite-${suffix}@e2e.test`);
    const membership = await prisma.userOrganisation.findFirst({
      where: { userId: created.id, organisationId: orgA },
    });
    expect(membership).toBeTruthy();
  });

  it('provisions user, membership, enrollment and activation token atomically', async () => {
    const email = `provisioned-${suffix}@e2e.test`;
    const created = await users.create(
      {
        email,
        firstName: 'Provisioned',
        lastName: 'Learner',
        roleId: roleLearnerId,
        programmeId,
      },
      asAdmin(),
    );
    const [account, membership, enrollment, activation] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.userOrganisation.findFirst({
        where: { userId: created.id, organisationId: orgA },
      }),
      prisma.enrollment.findFirst({
        where: { learnerId: created.id, programmeId },
      }),
      prisma.passwordResetToken.findFirst({
        where: { userId: created.id, purpose: 'ACTIVATION', usedAt: null },
      }),
    ]);
    expect(account?.passwordSetAt).toBeNull();
    expect(membership).toBeTruthy();
    expect(enrollment).toBeTruthy();
    expect(activation?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(activationMail.sendActivation).toHaveBeenCalledWith(
      email,
      expect.stringContaining('/reset-password?token='),
    );

    const failedEmail = `rollback-${suffix}@e2e.test`;
    await expect(
      users.create(
        {
          email: failedEmail,
          firstName: 'Rollback',
          lastName: 'Learner',
          roleId: roleLearnerId,
          programmeId: randomUUID(),
        },
        asAdmin(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await prisma.user.findUnique({ where: { email: failedEmail } })).toBeNull();
  });
});
