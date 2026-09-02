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
  const invitations = new InvitationsService(
    prisma,
    { sendPasswordReset: jest.fn() } as never,
    { get: jest.fn() } as never,
  );

  const suffix = randomUUID().slice(0, 8);
  let orgA: string;
  let orgB: string;
  let learnerId: string;
  let assessorId: string;
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
    const [rLearner, rAssessor, rAdmin, rMod] = await Promise.all([
      role('LEARNER'),
      role('ASSESSOR'),
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

    const [learner, assessor, other, moderator, admin] = await Promise.all([
      mkUser(`learner-${suffix}@e2e.test`),
      mkUser(`assessor-${suffix}@e2e.test`),
      mkUser(`other-${suffix}@e2e.test`),
      mkUser(`mod-${suffix}@e2e.test`),
      mkUser(`admin-${suffix}@e2e.test`),
    ]);
    learnerId = learner.id;
    assessorId = assessor.id;
    otherAssessorId = other.id;
    moderatorId = moderator.id;
    adminId = admin.id;
    invitedById = admin.id;

    await prisma.userOrganisation.createMany({
      data: [
        { userId: learner.id, roleId: rLearner.id, organisationId: orgA },
        { userId: assessor.id, roleId: rAssessor.id, organisationId: orgA },
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

  it('rejects human score above question points and ignores client maxScore', async () => {
    await expect(
      instances.humanGrade(
        submissionId,
        [{ questionId, score: 99, maxScore: 100 } as never],
        asAssessor(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const graded = await instances.humanGrade(
      submissionId,
      [{ questionId, score: 7 }],
      asAssessor(),
    );
    expect(graded.score).toBe(7);
    await instances.completeGrading(submissionId, asAssessor());
    const stored = await prisma.assessmentSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });
    const responses = stored.responses as Array<{ maxScore: number; score: number }>;
    expect(responses[0].maxScore).toBe(10);
    expect(responses[0].score).toBe(7);
  });

  it('enforces allocated assessor on human grading', async () => {
    await expect(
      instances.humanGrade(
        submissionId,
        [{ questionId, score: 4 }],
        asOtherAssessor(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets allocated assessor finalise C/NYC; moderation does not overwrite it', async () => {
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
    expect(after.result).toBe('C');
    expect(after.assessorId).toBe(assessorId);
    const mod = await prisma.moderation.findUnique({
      where: { assessmentId },
    });
    expect(mod?.decision).toBe('REJECTED');
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
    await prisma.attendanceSession.create({
      data: {
        organisationId: orgA,
        programmeId,
        openedById: adminId,
        tokenHash: hashOpaqueToken(generateOpaqueRefreshToken()),
        expiresAt: new Date(Date.now() + 30 * 60_000),
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
});
