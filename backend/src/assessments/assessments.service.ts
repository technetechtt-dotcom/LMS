import type { AuthUser } from '../common/types/request-with-user';
import {
  assertAllocatedAssessor,
  assertEnrollmentAccess,
  isLearnerOnly,
  isStaffUser,
  requireOrganisationId,
  enrollmentOrgWhere,
} from '../common/tenant/tenant-scope';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { competencyFromPercentage } from '../common/grading/competency';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto, UpdateAssessmentDto } from './assessments.dto';
import {
  mapAssessmentToApi,
  type AssessmentWithRelations,
} from './assessments.mapper';

function mapQuestionType(questionType: string): string {
  switch (questionType) {
    case 'mcq_single':
    case 'mcq':
      return 'multiple_choice';
    case 'true_false':
    case 'boolean':
      return 'true_false';
    case 'long_answer':
    case 'essay':
      return 'essay';
    case 'file_upload':
      return 'file_upload';
    default:
      return 'essay';
  }
}

function mapQuestionToApi(
  q: {
    id: string;
    orderIndex: number;
    prompt: string;
    questionType: string;
    options: unknown;
    points: number;
    createdAt: Date;
    updatedAt: Date;
  },
  assessmentId: string,
  includeAnswers: boolean,
): Record<string, unknown> {
  const opts = (q.options as Record<string, unknown> | null) ?? {};
  const choices = Array.isArray(opts.choices) ? (opts.choices as string[]) : [];
  const type = mapQuestionType(q.questionType);
  const base = {
    id: q.id,
    assessmentId,
    type,
    content: q.prompt,
    points: q.points,
    order: q.orderIndex,
    isRequired: true,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
  if (type === 'multiple_choice') {
    const options = choices.map((text, i) => ({
      id: String(i),
      text,
      order: i,
    }));
    return {
      ...base,
      options,
      ...(includeAnswers
        ? {
            correctOptionId:
              typeof opts.correctIndex === 'number'
                ? String(opts.correctIndex)
                : undefined,
          }
        : {}),
    };
  }
  if (type === 'true_false') {
    return {
      ...base,
      ...(includeAnswers
        ? { correctAnswer: Boolean(opts.correctAnswer ?? true) }
        : {}),
    };
  }
  return base;
}

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgFilter(organisationId: string) {
    return {
      enrollment: {
        OR: [
          { sdioOrganisationId: organisationId },
          { employerOrganisationId: organisationId },
          { programme: { organisationId } },
        ],
      },
    };
  }

  list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.assessment
      .findMany({
        where: {
          deletedAt: null,
          enrollment: {
            ...enrollmentOrgWhere(organisationId),
            ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
          },
        },
        include: {
          enrollment: {
            include: { programme: true, learner: true },
          },
          unitStandard: true,
          moderation: true,
          submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { assessedAt: 'desc' },
      })
      .then((rows) =>
        rows.map((r) => mapAssessmentToApi(r as AssessmentWithRelations)),
      );
  }

  async byId(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.assessment.findFirst({
      where: {
        id,
        deletedAt: null,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      include: {
        enrollment: {
          include: { programme: true, learner: true },
        },
        unitStandard: true,
        moderation: true,
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!row) throw new NotFoundException('Assessment not found');
    assertEnrollmentAccess(user, row.enrollment, 'Assessment');
    const mapped = mapAssessmentToApi(row as AssessmentWithRelations);
    const questions = await this.questions(id, user);
    return { ...mapped, questions, questionCount: questions.length };
  }

  async questions(assessmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const a = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        deletedAt: null,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      select: {
        id: true,
        unitStandardId: true,
        enrollmentId: true,
        enrollment: { select: { learnerId: true } },
      },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    assertEnrollmentAccess(user, a.enrollment, 'Assessment');

    // Learners never receive answer keys; staff may.
    const includeAnswers = isStaffUser(user);

    const published = await this.prisma.assessmentInstrument.findFirst({
      where: {
        unitStandardId: a.unitStandardId,
        status: 'PUBLISHED',
      },
      orderBy: { version: 'desc' },
      select: { id: true },
    });
    if (!published) {
      throw new NotFoundException(
        'No published assessment instrument for this unit standard',
      );
    }

    // Read-only: never create attempts on GET. Prefer bound in-progress instrument.
    let instrumentId = published.id;
    const inProgress = await this.prisma.assessmentSubmission.findFirst({
      where: {
        assessmentId: a.id,
        enrollmentId: a.enrollmentId,
        status: 'in_progress',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (inProgress?.instrumentId) {
      instrumentId = inProgress.instrumentId;
    }

    const rows = await this.prisma.assessmentQuestion.findMany({
      where: {
        deletedAt: null,
        instrumentId,
      },
      orderBy: { orderIndex: 'asc' },
    });
    return rows.map((q) => mapQuestionToApi(q, assessmentId, includeAnswers));
  }

  /**
   * Explicit attempt start — enforces maxAttempts and binds instrumentId.
   */
  async startAttempt(assessmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const a = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        deletedAt: null,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user.userId } : {}),
        },
      },
      select: {
        id: true,
        unitStandardId: true,
        enrollmentId: true,
        enrollment: { select: { learnerId: true } },
      },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    assertEnrollmentAccess(user, a.enrollment, 'Assessment');

    const existingOpen = await this.prisma.assessmentSubmission.findFirst({
      where: {
        assessmentId: a.id,
        enrollmentId: a.enrollmentId,
        status: 'in_progress',
      },
    });
    if (existingOpen) return existingOpen;

    const published = await this.prisma.assessmentInstrument.findFirst({
      where: { unitStandardId: a.unitStandardId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
    if (!published) {
      throw new BadRequestException('No published assessment instrument');
    }

    const priorCount = await this.prisma.assessmentSubmission.count({
      where: {
        assessmentId: a.id,
        enrollmentId: a.enrollmentId,
        status: { not: 'in_progress' },
      },
    });
    const nextAttempt = priorCount + 1;
    if (published.maxAttempts > 0 && nextAttempt > published.maxAttempts) {
      throw new ForbiddenException(
        `Maximum attempts (${published.maxAttempts}) reached for this instrument`,
      );
    }

    return this.prisma.assessmentSubmission.create({
      data: {
        enrollmentId: a.enrollmentId,
        assessmentId: a.id,
        instrumentId: published.id,
        attemptNumber: nextAttempt,
        status: 'in_progress',
        responses: [],
      },
    });
  }

  async create(dto: CreateAssessmentDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'Enrollment is not in the active organisation',
      );
    }
    const unit = await this.prisma.unitStandard.findFirst({
      where: { id: dto.unitStandardId },
      select: { id: true },
    });
    if (!unit) throw new BadRequestException('unitStandardId is invalid');

    let assessorId = user.userId;
    if (dto.assessorId) {
      const membership = await this.prisma.userOrganisation.findFirst({
        where: {
          userId: dto.assessorId,
          organisationId,
          deletedAt: null,
          user: { deletedAt: null, isActive: true },
          role: { code: { in: ['ASSESSOR', 'ADMIN'] }, deletedAt: null },
        },
      });
      if (!membership) {
        throw new BadRequestException(
          'assessorId must be an active ASSESSOR/ADMIN in this organisation',
        );
      }
      assessorId = dto.assessorId;
    } else {
      const selfOk = await this.prisma.userOrganisation.findFirst({
        where: {
          userId: user.userId,
          organisationId,
          deletedAt: null,
          role: { code: { in: ['ASSESSOR', 'ADMIN', 'FACILITATOR'] } },
        },
      });
      if (!selfOk) {
        throw new ForbiddenException(
          'Caller cannot be assigned as assessor for this assessment',
        );
      }
    }

    return this.prisma.assessment.create({
      data: {
        enrollmentId: dto.enrollmentId,
        unitStandardId: dto.unitStandardId,
        assessorId,
        result: 'PENDING',
        feedback: dto.feedback,
      },
    });
  }

  async finaliseResult(
    id: string,
    body: { result: 'C' | 'NYC'; feedback?: string },
    user?: AuthUser,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        deletedAt: null,
        enrollment: enrollmentOrgWhere(requireOrganisationId(user)),
      },
      select: { id: true, assessorId: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    assertAllocatedAssessor(user, assessment.assessorId);
    const submitted = await this.prisma.assessmentSubmission.findFirst({
      where: {
        assessmentId: id,
        status: 'assessor_verified',
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        instrument: { select: { passMark: true } },
      },
    });
    if (!submitted) {
      throw new BadRequestException(
        'Cannot finalise competency until grading is complete (GRADING_COMPLETE)',
      );
    }
    const passMark = submitted.instrument?.passMark ?? 50;
    const percentage = Number(submitted.percentage ?? 0);
    const result = competencyFromPercentage(percentage, passMark);
    return this.prisma.assessment.update({
      where: { id },
      data: {
        result,
        feedback: body.feedback,
        assessedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async update(id: string, body: UpdateAssessmentDto, user?: AuthUser) {
    await this.byId(id, user);

    const questions = Array.isArray(body.questions) ? body.questions : null;
    if (questions) {
      const assessment = await this.prisma.assessment.findFirst({
        where: { id, deletedAt: null },
        select: { unitStandardId: true },
      });
      if (assessment) {
        const published = await this.prisma.assessmentInstrument.findFirst({
          where: {
            unitStandardId: assessment.unitStandardId,
            status: { in: ['PUBLISHED', 'RETIRED'] },
          },
        });
        if (published) {
          throw new ForbiddenException(
            'Published assessment instruments are immutable — create a new draft version',
          );
        }
        await this.replaceQuestions(assessment.unitStandardId, questions);
      }
    }

    await this.prisma.assessment.update({
      where: { id },
      data: {
        ...(typeof body.feedback === 'string' ? { feedback: body.feedback } : {}),
        version: { increment: 1 },
      },
    });

    return this.byId(id, user);
  }

  private async replaceQuestions(
    unitStandardId: string,
    questions: unknown[],
  ) {
    await this.prisma.assessmentQuestion.updateMany({
      where: {
        unitStandardId,
        deletedAt: null,
        OR: [{ instrumentId: null }, { instrument: { status: 'DRAFT' } }],
      },
      data: { deletedAt: new Date() },
    });

    let order = 1;
    for (const raw of questions) {
      const q = raw as Record<string, unknown>;
      const type = String(q.type ?? q.questionType ?? 'essay');
      const questionType =
        type === 'multiple_choice'
          ? 'mcq_single'
          : type === 'true_false'
            ? 'true_false'
            : type === 'file_upload'
              ? 'file_upload'
              : 'long_answer';
      const optionsArr = Array.isArray(q.options) ? q.options : [];
      const choices = optionsArr.map((o) =>
        typeof o === 'string'
          ? o
          : String((o as { text?: string }).text ?? ''),
      );
      const correctOptionId = q.correctOptionId;
      let correctIndex =
        typeof q.correctIndex === 'number' ? q.correctIndex : undefined;
      if (correctIndex == null && correctOptionId != null) {
        const idx = Number(correctOptionId);
        correctIndex = Number.isFinite(idx) ? idx : 0;
      }

      await this.prisma.assessmentQuestion.create({
        data: {
          unitStandardId,
          orderIndex: typeof q.order === 'number' ? q.order : order,
          prompt: String(q.content ?? q.prompt ?? ''),
          questionType,
          points: typeof q.points === 'number' ? q.points : 1,
          options:
            questionType === 'mcq_single'
              ? { choices, correctIndex: correctIndex ?? 0 }
              : questionType === 'true_false'
                ? { correctAnswer: Boolean(q.correctAnswer ?? true) }
                : Prisma.JsonNull,
        },
      });
      order += 1;
    }
  }
}
