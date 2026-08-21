import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './attendance.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class AttendanceService {
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
      assertEnrollmentAccess(user, enrollment, 'Attendance');
    }

    return this.prisma.attendance.findMany({
      where: {
        deletedAt: null,
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...(isLearnerOnly(user) ? { learnerId: user!.userId } : {}),
        },
      },
      include: {
        enrollment: {
          include: {
            learner: true,
            programme: { include: { qualification: true } },
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
      take: 500,
    });
  }

  async create(dto: CreateAttendanceDto, user?: AuthUser) {
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
    assertEnrollmentAccess(user, enrollment, 'Attendance');

    return this.prisma.attendance.create({
      data: {
        ...dto,
        sessionDate: new Date(dto.sessionDate),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }
}
