import {
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

type ResponseInput = {
  questionId: string;
  questionType?: string;
  answer?: unknown;
};

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
        enrollment: enrollmentOrgWhere(organisationId),
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

    // Learners: bind to their own enrollment for this assessment (ignore client ids).
    // Staff may submit on behalf only when enrollmentId is in-tenant.
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

    const responsesRaw = Array.isArray(body.responses) ? body.responses : [];
    // Strip any client-supplied scoring fields before grading.
    const sanitized: ResponseInput[] = responsesRaw.map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        questionId: String(r.questionId ?? ''),
        questionType:
          typeof r.questionType === 'string' ? r.questionType : undefined,
        answer: r.answer,
      };
    });

    const graded = await this.autoGradeAgainstBank(
      assessment.unitStandardId,
      sanitized,
    );
    const totalScore = graded.reduce((s, r) => s + (r.score ?? 0), 0);
    const maxScore = graded.reduce((s, r) => s + (r.maxScore ?? 1), 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const published = await this.prisma.assessmentInstrument.findFirst({
      where: {
        unitStandardId: assessment.unitStandardId,
        status: 'PUBLISHED',
      },
      orderBy: { version: 'desc' },
    });

    const now = new Date();
    const row = await this.prisma.assessmentSubmission.create({
      data: {
        enrollmentId,
        assessmentId,
        instrumentId: published?.id,
        status: 'submitted',
        responses: graded as object[],
        score: totalScore,
        percentage,
        submittedAt: now,
      },
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

  /** Server-side grading only — never trusts client score/isCorrect/maxScore. */
  async autoGradeAgainstBank(
    unitStandardId: string,
    responses: ResponseInput[],
  ): Promise<
    Array<ResponseInput & { score: number; maxScore: number; isCorrect: boolean }>
  > {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { unitStandardId, deletedAt: null },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));

    return responses.map((r) => {
      const q = byId.get(r.questionId);
      const max = q?.points ?? 1;
      const opts = (q?.options as Record<string, unknown> | null) ?? {};
      let score = 0;
      let isCorrect = false;

      if (q) {
        if (typeof opts.correctIndex === 'number') {
          const answerIdx =
            typeof r.answer === 'number'
              ? r.answer
              : typeof r.answer === 'string' && /^\d+$/.test(r.answer)
                ? Number(r.answer)
                : Array.isArray(opts.choices)
                  ? (opts.choices as string[]).indexOf(String(r.answer))
                  : -1;
          isCorrect = answerIdx === opts.correctIndex;
          score = isCorrect ? max : 0;
        } else if (opts.correctAnswer != null) {
          isCorrect =
            String(r.answer).trim().toLowerCase() ===
            String(opts.correctAnswer).trim().toLowerCase();
          score = isCorrect ? max : 0;
        } else if (
          (typeof r.answer === 'string' && r.answer.trim()) ||
          typeof r.answer === 'boolean' ||
          (Array.isArray(r.answer) && r.answer.length)
        ) {
          // Open answers: mark pending (0 until human grade).
          score = 0;
          isCorrect = false;
        }
      }

      return { ...r, score, maxScore: max, isCorrect };
    });
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
