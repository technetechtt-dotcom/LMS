import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

type ResponseInput = {
  questionId: string;
  questionType?: string;
  answer?: unknown;
  maxScore?: number;
  score?: number;
  isCorrect?: boolean;
};

@Injectable()
export class AssessmentInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  private orgEnrollmentFilter(organisationId: string) {
    return {
      OR: [
        { sdioOrganisationId: organisationId },
        { employerOrganisationId: organisationId },
        { programme: { organisationId } },
      ],
    };
  }

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
        enrollment: this.orgEnrollmentFilter(organisationId),
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
        enrollment: this.orgEnrollmentFilter(organisationId),
      },
      include: {
        enrollment: { include: { learner: true } },
        assessment: { include: { unitStandard: true } },
      },
    });
    if (!row) throw new NotFoundException('Submission not found');
    return this.mapSubmission(row);
  }

  async submit(body: Record<string, unknown>, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollmentId = String(body.enrollmentId ?? body.learnerId ?? '');
    const assessmentId = String(body.assessmentId ?? '');
    if (!enrollmentId || !assessmentId) {
      throw new NotFoundException('enrollmentId and assessmentId are required');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...this.orgEnrollmentFilter(organisationId),
      },
    });
    if (!enrollment) throw new ForbiddenException('Enrollment not in organisation');

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null, enrollmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const responsesRaw = Array.isArray(body.responses) ? body.responses : [];
    const graded = await this.autoGradeAgainstBank(
      assessment.unitStandardId,
      responsesRaw as ResponseInput[],
    );
    const totalScore = graded.reduce((s, r) => s + (r.score ?? 0), 0);
    const maxScore = graded.reduce((s, r) => s + (r.maxScore ?? 1), 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const now = new Date();
    const row = await this.prisma.assessmentSubmission.create({
      data: {
        enrollmentId,
        assessmentId,
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

  async moderate(id: string, decision: string, comments?: string, user?: AuthUser) {
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

  /** Grade against AssessmentQuestion bank when correctIndex / correctAnswer present. */
  async autoGradeAgainstBank(
    unitStandardId: string,
    responses: ResponseInput[],
  ): Promise<ResponseInput[]> {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { unitStandardId, deletedAt: null },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));

    return responses.map((r) => {
      const q = byId.get(r.questionId);
      const max = r.maxScore ?? q?.points ?? 1;
      const opts = (q?.options as Record<string, unknown> | null) ?? {};
      let score = r.score;
      let isCorrect = r.isCorrect;

      if (score == null && q) {
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
        } else if (typeof r.answer === 'string' && r.answer.trim()) {
          score = max * 0.5;
          isCorrect = false;
        } else {
          score = 0;
          isCorrect = false;
        }
      } else if (score == null) {
        score = 0;
        isCorrect = false;
      }

      return { ...r, score, maxScore: max, isCorrect };
    });
  }

  autoGrade(responses: ResponseInput[]) {
    return responses.map((r) => {
      const max = r.maxScore ?? 1;
      let score = r.score;
      let isCorrect = r.isCorrect;
      if (score == null) {
        if (typeof r.answer === 'boolean') {
          isCorrect = r.isCorrect ?? true;
          score = isCorrect ? max : 0;
        } else if (Array.isArray(r.answer)) {
          score = max * 0.5;
          isCorrect = false;
        } else if (typeof r.answer === 'string' && r.answer.trim()) {
          score = max * 0.8;
          isCorrect = true;
        } else {
          score = 0;
          isCorrect = false;
        }
      }
      return { ...r, score, maxScore: max, isCorrect };
    });
  }
}
