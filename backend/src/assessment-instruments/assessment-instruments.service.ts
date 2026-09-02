import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import {
  CreateInstrumentDto,
  ReplaceInstrumentQuestionsDto,
  UpdateInstrumentDto,
} from './assessment-instruments.dto';

@Injectable()
export class AssessmentInstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByUnitStandard(unitStandardId: string, user?: AuthUser) {
    requireOrganisationId(user);
    return this.prisma.assessmentInstrument.findMany({
      where: { unitStandardId },
      orderBy: { version: 'desc' },
      include: {
        _count: { select: { questions: true, submissions: true } },
      },
    });
  }

  async byId(id: string, user?: AuthUser) {
    requireOrganisationId(user);
    const row = await this.prisma.assessmentInstrument.findFirst({
      where: { id },
      include: {
        questions: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Instrument not found');
    return row;
  }

  async createDraft(dto: CreateInstrumentDto, user?: AuthUser) {
    requireOrganisationId(user);
    const unit = await this.prisma.unitStandard.findFirst({
      where: { id: dto.unitStandardId, deletedAt: null },
    });
    if (!unit) throw new NotFoundException('Unit standard not found');

    const latest = await this.prisma.assessmentInstrument.findFirst({
      where: { unitStandardId: dto.unitStandardId },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    return this.prisma.assessmentInstrument.create({
      data: {
        unitStandardId: dto.unitStandardId,
        version,
        title: dto.title ?? `Instrument v${version}`,
        status: 'DRAFT',
        maxAttempts: dto.maxAttempts ?? 3,
      },
    });
  }

  async updateDraft(id: string, dto: UpdateInstrumentDto, user?: AuthUser) {
    const row = await this.assertDraft(id, user);
    return this.prisma.assessmentInstrument.update({
      where: { id: row.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.maxAttempts !== undefined ? { maxAttempts: dto.maxAttempts } : {}),
      },
    });
  }

  async replaceQuestions(
    id: string,
    dto: ReplaceInstrumentQuestionsDto,
    user?: AuthUser,
  ) {
    const row = await this.assertDraft(id, user);
    await this.prisma.assessmentQuestion.updateMany({
      where: { instrumentId: row.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    let order = 1;
    for (const raw of dto.questions) {
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
          unitStandardId: row.unitStandardId,
          instrumentId: row.id,
          orderIndex: typeof q.order === 'number' ? q.order : order,
          prompt: String(q.content ?? q.prompt ?? ''),
          questionType,
          points: typeof q.points === 'number' ? q.points : 1,
          options:
            questionType === 'mcq_single'
              ? { choices, correctIndex: correctIndex ?? 0 }
              : questionType === 'true_false'
                ? { correct: q.correctAnswer ?? true }
                : undefined,
        },
      });
      order += 1;
    }

    return this.byId(row.id, user);
  }

  async publish(id: string, user?: AuthUser) {
    const row = await this.assertDraft(id, user);
    const qCount = await this.prisma.assessmentQuestion.count({
      where: { instrumentId: row.id, deletedAt: null },
    });
    if (qCount === 0) {
      throw new BadRequestException('Cannot publish instrument without questions');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.assessmentInstrument.updateMany({
        where: {
          unitStandardId: row.unitStandardId,
          status: 'PUBLISHED',
        },
        data: { status: 'RETIRED' },
      });
      return tx.assessmentInstrument.update({
        where: { id: row.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
        include: {
          questions: {
            where: { deletedAt: null },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });
  }

  async retire(id: string, user?: AuthUser) {
    const row = await this.byId(id, user);
    if (row.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published instruments can be retired');
    }
    return this.prisma.assessmentInstrument.update({
      where: { id },
      data: { status: 'RETIRED' },
    });
  }

  private async assertDraft(id: string, user?: AuthUser) {
    requireOrganisationId(user);
    const row = await this.prisma.assessmentInstrument.findFirst({
      where: { id },
    });
    if (!row) throw new NotFoundException('Instrument not found');
    if (row.status !== 'DRAFT') {
      throw new ForbiddenException('Only DRAFT instruments can be edited');
    }
    return row;
  }
}
