import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
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
    await this.byId(id, user);

    const status =
      decision === 'approve'
        ? 'completed'
        : decision === 'reject'
          ? 'rejected'
          : 'grading';

    const row = await this.prisma.assessmentSubmission.update({
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
    return this.mapSubmission(row);
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
