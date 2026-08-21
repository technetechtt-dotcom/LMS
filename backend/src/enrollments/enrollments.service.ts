import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto, TransitionEnrollmentDto } from './enrollments.dto';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgScope(organisationId: string) {
    return {
      OR: [
        { sdioOrganisationId: organisationId },
        { employerOrganisationId: organisationId },
        { programme: { organisationId } },
      ],
    };
  }

  list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.enrollment.findMany({
      where: { deletedAt: null, ...this.orgScope(organisationId) },
      include: { learner: true, programme: true, employerOrganisation: true },
    });
  }

  create(dto: CreateEnrollmentDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.enrollment.create({
      data: {
        ...dto,
        sdioOrganisationId: dto.sdioOrganisationId || organisationId,
      },
    });
  }

  async softDelete(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null, ...this.orgScope(organisationId) },
    });
    if (!row) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async transition(
    id: string,
    dto: TransitionEnrollmentDto,
    changedById: string,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null, ...this.orgScope(organisationId) },
    });
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
