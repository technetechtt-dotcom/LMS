import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertAllocatedAssessor,
  assertEnrollmentAccess,
  canAssessorReview,
  canFacilitatorMark,
  canModerateSubmission,
  enrollmentOrgWhere,
  isLearnerOnly,
  isPlatformAdmin,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import {
  gradeAgainstInstrument,
  type ResponseInput,
} from './grade-instrument';

@Injectable()
export class AssessmentInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapSubmission(row: {
    id: string;
    enrollmentId: string;
    assessmentId: string;
    status: string;
    responses: unknown;
    score: number | null;
    percentage: number | null;
    feedback: string | null;
    submittedAt: Date | null;
    gradedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    enrollment: {
      learner: { firstName: string; lastName: string };
    };
    assessment: {
      unitStandard: { title: string };
    };
  }) {
    const learnerName =
      `${row.enrollment.learner.firstName} ${row.enrollment.learner.lastName}`.trim();
    return {
      id: row.id,
      learnerId: row.enrollmentId,
      learnerName,
      assessmentId: row.assessmentId,
      assessmentTitle: row.assessment.unitStandard.title,
      status: row.status,
      submittedAt: row.submittedAt?.toISOString(),
      gradedAt: row.gradedAt?.toISOString(),
      score: row.score ?? undefined,
      percentage: row.percentage ?? undefined,
      responses: row.responses,
      feedback: row.feedback ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(user?: AuthUser, status?: string) {
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.assessmentSubmission.findMany({
      where: {
        ...(status ? { status } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.mapSubmission(r));
  }

  async byId(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });
    if (!row) throw new NotFoundException('Submission not found');
    assertEnrollmentAccess(user, row.enrollment, 'Submission');
    return this.mapSubmission(row);
  }

  async submit(body: Record<string, unknown>, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) {
      throw new ForbiddenException('Authentication required');
    }

    const assessmentId = String(body.assessmentId ?? '');
    if (!assessmentId) {
      throw new NotFoundException('assessmentId is required');
    }

    let enrollmentId = String(body.enrollmentId ?? body.learnerId ?? '');

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        deletedAt: null,
        enrollment: enrollmentOrgWhere(organisationId),
      },
      include: {
        enrollment: { select: { id: true, learnerId: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (isLearnerOnly(user)) {
      if (assessment.enrollment.learnerId !== user.userId) {
        throw new ForbiddenException(
          'You may only submit assessments for your own enrolment',
        );
      }
      enrollmentId = assessment.enrollmentId;
    } else {
      if (!enrollmentId) enrollmentId = assessment.enrollmentId;
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          deletedAt: null,
          ...enrollmentOrgWhere(organisationId),
        },
        select: { id: true, learnerId: true },
      });
      if (!enrollment) {
        throw new ForbiddenException('Enrollment not in organisation');
      }
      if (enrollment.id !== assessment.enrollmentId) {
        throw new ForbiddenException(
          'Assessment does not belong to the given enrolment',
        );
      }
    }

    const inProgress = await this.prisma.assessmentSubmission.findFirst({
      where: {
        assessmentId,
        enrollmentId,
        status: 'in_progress',
      },
      orderBy: { createdAt: 'desc' },
    });

    let instrumentId = inProgress?.instrumentId ?? null;
    if (!instrumentId) {
      const published = await this.prisma.assessmentInstrument.findFirst({
        where: {
          unitStandardId: assessment.unitStandardId,
          status: 'PUBLISHED',
        },
        orderBy: { version: 'desc' },
      });
      if (!published) {
        throw new BadRequestException(
          'No published assessment instrument available for grading',
        );
      }
      instrumentId = published.id;
    }

    const instrument = await this.prisma.assessmentInstrument.findFirst({
      where: { id: instrumentId },
    });
    if (!instrument) {
      throw new BadRequestException('Bound assessment instrument not found');
    }

    const responsesRaw = Array.isArray(body.responses) ? body.responses : [];
    const sanitized: ResponseInput[] = responsesRaw.map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        questionId: String(r.questionId ?? ''),
        questionType:
          typeof r.questionType === 'string' ? r.questionType : undefined,
        answer: r.answer,
      };
    });

    const { graded, totalScore, percentage } =
      await this.autoGradeAgainstInstrument(instrumentId, sanitized);

    const now = new Date();
    const data = {
      enrollmentId,
      assessmentId,
      instrumentId,
      status: 'submitted',
      responses: graded as object[],
      score: totalScore,
      percentage,
      submittedAt: now,
    };

    const row = inProgress
      ? await this.prisma.assessmentSubmission.update({
          where: { id: inProgress.id },
          data,
          include: {
            enrollment: { include: { learner: true } },
            assessment: { include: { unitStandard: true } },
          },
        })
      : await this.prisma.assessmentSubmission.create({
          data,
          include: {
            enrollment: { include: { learner: true } },
            assessment: { include: { unitStandard: true } },
          },
        });
    return this.mapSubmission(row);
  }

  async moderate(
    id: string,
    decision: string,
    comments?: string,
    user?: AuthUser,
  ) {
    if (decision !== 'approve' && decision !== 'reject') {
      throw new BadRequestException('decision must be approve or reject');
    }
    if (!user?.userId) {
      throw new ForbiddenException('Authentication required');
    }
    if (!canModerateSubmission(user)) {
      throw new ForbiddenException('Only moderators may sign off assessments');
    }

    const row = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        enrollment: enrollmentOrgWhere(requireOrganisationId(user)),
      },
      include: {
        assessment: { select: { result: true, id: true } },
      },
    });
    if (!row) throw new NotFoundException('Submission not found');
    if (row.status !== 'assessor_verified') {
      throw new BadRequestException(
        'Moderation requires assessor-verified submissions',
      );
    }
    if (!['C', 'NYC'].includes(row.assessment.result)) {
      throw new BadRequestException(
        'Assessor must finalise C/NYC competency before moderation',
      );
    }

    const status = decision === 'approve' ? 'completed' : 'rejected';

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: {
        status,
        feedback: comments,
        gradedAt: new Date(),
      },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });

    // Moderation records a quality decision; it does not set competency C/NYC.
    await this.prisma.moderation.upsert({
      where: { assessmentId: row.assessmentId },
      create: {
        assessmentId: row.assessmentId,
        moderatorId: user.userId,
        decision: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        feedback: comments,
        moderatedAt: new Date(),
      },
      update: {
        moderatorId: user.userId,
        decision: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        feedback: comments,
        moderatedAt: new Date(),
      },
    });

    return this.mapSubmission(updated);
  }

  /** Human marks for essay / file / practical items; maxScore is always question.points. */
  async humanGrade(
    id: string,
    grades: Array<{
      questionId: string;
      score: number;
      feedback?: string;
    }>,
    user?: AuthUser,
  ) {
    const row = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        enrollment: enrollmentOrgWhere(requireOrganisationId(user)),
      },
      include: { assessment: { select: { assessorId: true, unitStandardId: true } } },
    });
    if (!row) throw new NotFoundException('Submission not found');
    const status = row.status;
    const isAdmin =
      isPlatformAdmin(user) || Boolean(user?.roleCodes?.includes('ADMIN'));

    if (['submitted', 'facilitator_grading', 'grading'].includes(status)) {
      if (!canFacilitatorMark(user)) {
        throw new ForbiddenException(
          'Only facilitators may perform initial marking at this stage',
        );
      }
    } else if (['facilitator_graded', 'assessor_review'].includes(status)) {
      if (!canAssessorReview(user)) {
        throw new ForbiddenException(
          'Only assessors may review facilitator marking',
        );
      }
      if (!isAdmin) {
        assertAllocatedAssessor(user, row.assessment.assessorId);
      }
    } else {
      throw new BadRequestException(
        `Cannot grade submission in status "${status}"`,
      );
    }

    const nextStatus =
      ['submitted', 'facilitator_grading', 'grading'].includes(status)
        ? 'facilitator_grading'
        : 'assessor_review';

    const questions = await this.prisma.assessmentQuestion.findMany({
      where: {
        deletedAt: null,
        ...(row.instrumentId
          ? { instrumentId: row.instrumentId }
          : { unitStandardId: row.assessment.unitStandardId }),
      },
    });
    const questionById = new Map(questions.map((q) => [q.id, q]));
    for (const g of grades) {
      const q = questionById.get(g.questionId);
      if (!q) {
        throw new BadRequestException(
          `Unknown questionId ${g.questionId} for this instrument`,
        );
      }
      if (Number(g.score) > q.points) {
        throw new BadRequestException(
          `Score ${g.score} exceeds question points (${q.points})`,
        );
      }
    }

    const gradeMap = new Map(grades.map((g) => [g.questionId, g]));
    const responses = Array.isArray(row.responses)
      ? (row.responses as Array<Record<string, unknown>>)
      : [];
    const responseByQ = new Map(
      responses.map((r) => [String(r.questionId ?? ''), r]),
    );

    let totalScore = 0;
    let maxScore = 0;
    const merged: Array<Record<string, unknown>> = questions.map((q) => {
      const existing = responseByQ.get(q.id) ?? { questionId: q.id };
      const hg = gradeMap.get(q.id);
      const points = q.points;
      const score = hg ? Number(hg.score) : Number(existing.score ?? 0);
      maxScore += points;
      totalScore += score;
      return {
        ...existing,
        questionId: q.id,
        score,
        maxScore: points,
        humanFeedback: hg?.feedback,
        humanGraded: Boolean(hg),
      };
    });
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: {
        status: nextStatus,
        responses: merged as object[],
        humanGrades: grades as object[],
        score: totalScore,
        percentage,
        gradedAt: new Date(),
        feedback:
          grades
            .map((g) => g.feedback)
            .filter(Boolean)
            .join('\n') || row.feedback,
      },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });
    return this.mapSubmission(updated);
  }

  /** Autosave in-progress responses (resume support). */
  async saveProgress(
    id: string,
    responses: unknown[],
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const row = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        status: 'in_progress',
        enrollment: enrollmentOrgWhere(organisationId),
      },
      include: { enrollment: { select: { learnerId: true } } },
    });
    if (!row) throw new NotFoundException('In-progress submission not found');
    if (isLearnerOnly(user) && row.enrollment.learnerId !== user.userId) {
      throw new ForbiddenException('You may only save your own attempt');
    }

    const sanitized = (Array.isArray(responses) ? responses : []).map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        questionId: String(r.questionId ?? ''),
        questionType:
          typeof r.questionType === 'string' ? r.questionType : undefined,
        answer: r.answer,
      };
    });

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: { responses: sanitized as object[] },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });
    return this.mapSubmission(updated);
  }

  /** Facilitator completes initial marking — queues for assessor review. */
  async completeFacilitatorGrading(id: string, user?: AuthUser) {
    const row = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        enrollment: enrollmentOrgWhere(requireOrganisationId(user)),
      },
    });
    if (!row) throw new NotFoundException('Submission not found');
    if (!['facilitator_grading', 'grading'].includes(row.status)) {
      throw new BadRequestException(
        'Only facilitator-marked submissions can be sent for assessor review',
      );
    }
    if (!canFacilitatorMark(user)) {
      throw new ForbiddenException(
        'Only facilitators may complete initial marking',
      );
    }

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: { status: 'facilitator_graded', gradedAt: new Date() },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });
    return this.mapSubmission(updated);
  }

  /** Marks human grading complete — required before competency finalisation. */
  async completeGrading(id: string, user?: AuthUser) {
    const row = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        enrollment: enrollmentOrgWhere(requireOrganisationId(user)),
      },
      include: { assessment: { select: { assessorId: true } } },
    });
    if (!row) throw new NotFoundException('Submission not found');
    if (!['assessor_review', 'facilitator_graded'].includes(row.status)) {
      throw new BadRequestException(
        'Only assessor-reviewed submissions can be verified',
      );
    }
    if (!canAssessorReview(user)) {
      throw new ForbiddenException('Only assessors may verify marking');
    }
    const isAdmin =
      isPlatformAdmin(user) || Boolean(user?.roleCodes?.includes('ADMIN'));
    if (!isAdmin) {
      assertAllocatedAssessor(user, row.assessment.assessorId);
    }

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: { status: 'assessor_verified', gradedAt: new Date() },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });
    return this.mapSubmission(updated);
  }

  /** Grade only against the bound instrument; omitted questions still count in maxScore. */
  async autoGradeAgainstInstrument(
    instrumentId: string,
    responses: ResponseInput[],
  ) {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { instrumentId, deletedAt: null },
      orderBy: { orderIndex: 'asc' },
    });
    if (!questions.length) {
      throw new BadRequestException(
        'Instrument has no questions to grade against',
      );
    }
    return gradeAgainstInstrument(questions, responses);
  }

  /** @deprecated Prefer autoGradeAgainstInstrument — kept for unit tests. */
  async autoGradeAgainstBank(
    unitStandardId: string,
    responses: ResponseInput[],
  ) {
    const published = await this.prisma.assessmentInstrument.findFirst({
      where: { unitStandardId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
    if (!published) {
      return {
        graded: responses.map((r) => ({
          ...r,
          score: 0,
          maxScore: 1,
          isCorrect: false,
          omitted: true,
        })),
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
      };
    }
    return this.autoGradeAgainstInstrument(published.id, responses);
  }

  /** Staff-only heuristic when no unit bank is provided — still ignores client scores. */
  autoGrade(responses: ResponseInput[]) {
    return responses.map((r) => {
      const max = 1;
      let score = 0;
      let isCorrect = false;
      if (typeof r.answer === 'boolean') {
        isCorrect = r.answer === true;
        score = isCorrect ? max : 0;
      } else if (typeof r.answer === 'string' && r.answer.trim()) {
        score = 0;
        isCorrect = false;
      }
      return { ...r, score, maxScore: max, isCorrect };
    });
  }
}
