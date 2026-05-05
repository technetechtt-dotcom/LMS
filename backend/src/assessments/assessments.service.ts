import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './assessments.dto';
import {
  mapAssessmentToApi,
  type AssessmentWithRelations,
} from './assessments.mapper';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.assessment.findMany({
      where: { deletedAt: null },
      include: {
        enrollment: {
          include: { programme: true, learner: true },
        },
        unitStandard: true,
        moderation: true,
      },
      orderBy: { assessedAt: 'desc' },
    }).then((rows) =>
      rows.map((r) => mapAssessmentToApi(r as AssessmentWithRelations)),
    );
  }

  async byId(id: string) {
    const row = await this.prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        enrollment: {
          include: { programme: true, learner: true },
        },
        unitStandard: true,
        moderation: true,
      },
    });
    if (!row) throw new NotFoundException('Assessment not found');
    return mapAssessmentToApi(row as AssessmentWithRelations);
  }

  async questions(assessmentId: string) {
    const a = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      select: { unitStandardId: true },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    const rows = await this.prisma.assessmentQuestion.findMany({
      where: { unitStandardId: a.unitStandardId, deletedAt: null },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        prompt: true,
        questionType: true,
        options: true,
        points: true,
      },
    });
    return rows;
  }

  create(dto: CreateAssessmentDto) {
    return this.prisma.assessment.create({ data: dto });
  }
}
