import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvidenceDto } from './evidence.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class EvidenceService {
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
      assertEnrollmentAccess(user, enrollment, 'Evidence');
    }

    return this.prisma.evidence.findMany({
      where: {
        deletedAt: null,
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      include: { unitStandard: true, outcome: true },
    });
  }

  async create(dto: CreateEvidenceDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const uploadedById = user?.userId;
    if (!uploadedById) throw new NotFoundException('Authentication required');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Evidence');

    return this.prisma.evidence.create({
      data: {
        ...dto,
        uploadedById,
      },
    });
  }
}
