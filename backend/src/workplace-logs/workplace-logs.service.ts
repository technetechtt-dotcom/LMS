import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkplaceLogDto } from './workplace-logs.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class WorkplaceLogsService {
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
      assertEnrollmentAccess(user, enrollment, 'Workplace log');
    }

    return this.prisma.workplaceLog.findMany({
      where: {
        deletedAt: null,
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      orderBy: { logDate: 'desc' },
    });
  }

  async create(dto: CreateWorkplaceLogDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Workplace log');

    return this.prisma.workplaceLog.create({
      data: {
        ...dto,
        logDate: new Date(dto.logDate),
      },
    });
  }
}
