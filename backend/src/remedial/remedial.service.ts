import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { CreateRemedialAssignmentDto } from './remedial.dto';

@Injectable()
export class RemedialService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user?: AuthUser, enrollmentId?: string) {
    const organisationId = requireOrganisationId(user);
    if (enrollmentId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          deletedAt: null,
          ...enrollmentOrgWhere(organisationId),
        },
        select: { learnerId: true },
      });
      assertEnrollmentAccess(user, enrollment, 'Remedial assignment');
    }
    return this.prisma.remedialAssignment.findMany({
      where: {
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      include: {
        material: true,
        enrollment: { include: { learner: true, programme: true } },
        assignedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateRemedialAssignmentDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    if (isLearnerOnly(user)) {
      throw new BadRequestException('Learners cannot assign remedial work');
    }
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Remedial assignment');
    if (dto.materialId) {
      const material = await this.prisma.learningMaterial.findFirst({
        where: { id: dto.materialId, deletedAt: null, organisationId },
        select: { id: true },
      });
      if (!material) throw new BadRequestException('Material not found in organisation');
    }
    return this.prisma.remedialAssignment.create({
      data: {
        enrollmentId: dto.enrollmentId,
        materialId: dto.materialId,
        title: dto.title.trim(),
        instructions: dto.instructions?.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        assignedById: user.userId,
      },
    });
  }

  async acknowledge(id: string, user?: AuthUser) {
    const row = await this.findScoped(id, user);
    if (row.acknowledgedAt) return row;
    return this.prisma.remedialAssignment.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }

  async complete(id: string, user?: AuthUser) {
    const row = await this.findScoped(id, user);
    return this.prisma.remedialAssignment.update({
      where: { id },
      data: {
        acknowledgedAt: row.acknowledgedAt ?? new Date(),
        completedAt: new Date(),
      },
    });
  }

  private async findScoped(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.remedialAssignment.findFirst({
      where: {
        id,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
    });
    if (!row) throw new NotFoundException('Remedial assignment not found');
    return row;
  }
}
