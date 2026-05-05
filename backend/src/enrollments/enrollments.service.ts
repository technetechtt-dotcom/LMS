import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto, TransitionEnrollmentDto } from './enrollments.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.enrollment.findMany({
      where: { deletedAt: null },
      include: { learner: true, programme: true, employerOrganisation: true },
    });
  }

  create(dto: CreateEnrollmentDto) {
    return this.prisma.enrollment.create({ data: dto });
  }

  async softDelete(id: string) {
    const row = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async transition(id: string, dto: TransitionEnrollmentDto, changedById: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.enrollment.update({
        where: { id },
        data: { status: dto.toState },
      });

      await tx.enrollmentWorkflow.create({
        data: {
          enrollmentId: id,
          fromState: enrollment.status,
          toState: dto.toState,
          action: dto.action,
          reason: dto.reason,
          changedById,
          changedAt: dto.changedAt ? new Date(dto.changedAt) : undefined,
        },
      });

      return updated;
    });
  }
}
