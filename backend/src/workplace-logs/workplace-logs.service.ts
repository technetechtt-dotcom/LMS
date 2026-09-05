import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkplaceLogDto } from './workplace-logs.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { NotificationsService } from '../notifications/notifications.service';

function isMentorScoped(user?: AuthUser): boolean {
  if (!user?.roleCodes?.includes('MENTOR')) return false;
  return !user.roleCodes.some((c) =>
    ['ADMIN', 'PLATFORM_ADMIN', 'FACILITATOR', 'QA_OFFICER', 'ASSESSOR'].includes(
      c,
    ),
  );
}

function mentorEnrollmentWhere(user?: AuthUser): Prisma.EnrollmentWhereInput {
  return isMentorScoped(user)
    ? {
        metadata: {
          path: ['workplaceMentorId'],
          equals: user!.userId,
        },
      }
    : {};
}

@Injectable()
export class WorkplaceLogsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

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
          ...mentorEnrollmentWhere(user),
        },
      },
      include: {
        enrollment: {
          include: { learner: true, programme: true },
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
      select: { id: true, learnerId: true, metadata: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Workplace log');

    const log = await this.prisma.workplaceLog.create({
      data: {
        enrollmentId: dto.enrollmentId,
        logDate: new Date(dto.logDate),
        hoursWorked: dto.hoursWorked,
        activity: dto.activity,
        supervisorName: dto.supervisorName,
        supervisorEmail: dto.supervisorEmail,
        mentorStatus: 'PENDING',
      },
    });

    const meta = (enrollment.metadata as { workplaceMentorId?: string } | null) ?? {};
    if (meta.workplaceMentorId) {
      await this.notifications?.notify(
        meta.workplaceMentorId,
        'workplace',
        'Workplace log awaiting verification',
        'A learner submitted a workplace logbook entry for your review.',
        { logId: log.id, enrollmentId: enrollment.id },
      );
    }
    return log;
  }

  async mentorVerify(
    id: string,
    body: { decision: 'approve' | 'reject'; feedback?: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    if (body.decision !== 'approve' && body.decision !== 'reject') {
      throw new BadRequestException('decision must be approve or reject');
    }

    const row = await this.prisma.workplaceLog.findFirst({
      where: {
        id,
        deletedAt: null,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...mentorEnrollmentWhere(user),
        },
      },
      include: { enrollment: { select: { learnerId: true } } },
    });
    if (!row) throw new NotFoundException('Workplace log not found');
    if (row.mentorStatus === 'VERIFIED') {
      throw new BadRequestException('Log already mentor-verified (immutable)');
    }

    const verified = body.decision === 'approve';
    const updated = await this.prisma.workplaceLog.update({
      where: { id },
      data: {
        mentorStatus: verified ? 'VERIFIED' : 'REJECTED',
        mentorVerifiedAt: new Date(),
        mentorVerifiedById: user.userId,
        mentorFeedback: body.feedback,
        supervisorSignedAt: verified ? new Date() : row.supervisorSignedAt,
      },
    });
    await this.notifications?.notify(
      row.enrollment.learnerId,
      'workplace',
      verified ? 'Workplace log verified' : 'Workplace log returned',
      body.feedback ??
        (verified
          ? 'Your workplace mentor verified this log.'
          : 'Your workplace mentor requested changes to this log.'),
      { logId: id, decision: body.decision },
    );
    return updated;
  }

  /** Hours that count toward completion — mentor-verified only. */
  async verifiedHours(enrollmentId: string): Promise<number> {
    const rows = await this.prisma.workplaceLog.findMany({
      where: {
        enrollmentId,
        deletedAt: null,
        mentorStatus: 'VERIFIED',
      },
      select: { hoursWorked: true },
    });
    return rows.reduce((s, r) => s + Number(r.hoursWorked), 0);
  }
}
