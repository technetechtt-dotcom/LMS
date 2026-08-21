import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './assessments.dto';
import {
  mapAssessmentToApi,
  type AssessmentWithRelations,
} from './assessments.mapper';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

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
      correctOptionId:
        typeof opts.correctIndex === 'number'
          ? String(opts.correctIndex)
          : options[0]?.id,
    };
  }
  if (type === 'true_false') {
    return {
      ...base,
      correctAnswer: Boolean(opts.correctAnswer ?? true),
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
        where: { deletedAt: null, ...this.orgFilter(organisationId) },
        include: {
          enrollment: {
            include: { programme: true, learner: true },
          },
          unitStandard: true,
          moderation: true,
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
      where: { id, deletedAt: null, ...this.orgFilter(organisationId) },
      include: {
        enrollment: {
          include: { programme: true, learner: true },
        },
        unitStandard: true,
        moderation: true,
      },
    });
    if (!row) throw new NotFoundException('Assessment not found');
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
        ...this.orgFilter(organisationId),
      },
      select: { id: true, unitStandardId: true },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    const rows = await this.prisma.assessmentQuestion.findMany({
      where: { unitStandardId: a.unitStandardId, deletedAt: null },
      orderBy: { orderIndex: 'asc' },
    });
    return rows.map((q) => mapQuestionToApi(q, assessmentId));
  }

  create(dto: CreateAssessmentDto, user?: AuthUser) {
    requireOrganisationId(user);
    return this.prisma.assessment.create({ data: dto });
  }

  async update(
    id: string,
    body: Record<string, unknown>,
    user?: AuthUser,
  ) {
    await this.byId(id, user);

    const questions = Array.isArray(body.questions) ? body.questions : null;
    if (questions) {
      const assessment = await this.prisma.assessment.findFirst({
        where: { id, deletedAt: null },
        select: { unitStandardId: true },
      });
      if (assessment) {
        await this.replaceQuestions(assessment.unitStandardId, questions);
      }
    }

    const result =
      body.result === 'C' || body.result === 'NYC'
        ? body.result
        : undefined;

    await this.prisma.assessment.update({
      where: { id },
      data: {
        ...(typeof body.feedback === 'string' ? { feedback: body.feedback } : {}),
        ...(result ? { result } : {}),
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
      where: { unitStandardId, deletedAt: null },
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
