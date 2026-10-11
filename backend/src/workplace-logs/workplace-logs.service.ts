import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkplaceLogDto, UpdateWorkplaceLogDto } from './workplace-logs.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentActorWhere,
  enrollmentOrgWhere,
  isLearnerOnly,
  isStaffUser,
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
        OR: [
          { workplaceMentorId: user!.userId },
          {
            metadata: {
              path: ['workplaceMentorId'],
              equals: user!.userId,
            },
          },
        ],
      }
    : {};
}

function assignedMentorId(enrollment: {
  workplaceMentorId?: string | null;
  metadata: unknown;
}): string | undefined {
  if (enrollment.workplaceMentorId) return enrollment.workplaceMentorId;
  const meta = (enrollment.metadata as { workplaceMentorId?: string } | null) ?? {};
  return meta.workplaceMentorId;
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
          ...enrollmentActorWhere(user),
        },
        select: { learnerId: true, workplaceMentorId: true, metadata: true },
      });
      assertEnrollmentAccess(user, enrollment, 'Workplace log');
    }

    return this.prisma.workplaceLog.findMany({
      where: {
        deletedAt: null,
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...enrollmentActorWhere(user),
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
        ...enrollmentActorWhere(user),
      },
      select: { id: true, learnerId: true, metadata: true, workplaceMentorId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Workplace log');
    if (!isLearnerOnly(user) && enrollment.learnerId !== user?.userId) {
      throw new ForbiddenException('Only the enrolled learner may submit workplace logs');
    }

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

    const mentorId = assignedMentorId(enrollment);
    if (mentorId) {
      await this.notifications?.notify(
        mentorId,
        'workplace',
        'Workplace log awaiting verification',
        'A learner submitted a workplace logbook entry for your review.',
        { logId: log.id, enrollmentId: enrollment.id },
      );
    }
    return log;
  }

  async update(id: string, dto: UpdateWorkplaceLogDto, user?: AuthUser) {
    if (!isLearnerOnly(user)) {
      throw new ForbiddenException(
        'Staff must use the audited staff-correction endpoint to edit workplace logs',
      );
    }
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.workplaceLog.findFirst({
      where: {
        id,
        deletedAt: null,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          learnerId: user!.userId,
        },
      },
    });
    if (!row) throw new NotFoundException('Workplace log not found');
    if (row.mentorStatus === 'VERIFIED') {
      throw new BadRequestException('Verified logs cannot be edited');
    }
    return this.prisma.workplaceLog.update({
      where: { id },
      data: {
        ...(dto.logDate ? { logDate: new Date(dto.logDate) } : {}),
        ...(dto.hoursWorked !== undefined ? { hoursWorked: dto.hoursWorked } : {}),
        ...(dto.activity ? { activity: dto.activity } : {}),
        ...(dto.supervisorName ? { supervisorName: dto.supervisorName } : {}),
        ...(dto.supervisorEmail !== undefined
          ? { supervisorEmail: dto.supervisorEmail }
          : {}),
        mentorStatus: row.mentorStatus === 'REJECTED' ? 'PENDING' : row.mentorStatus,
        mentorFeedback: row.mentorStatus === 'REJECTED' ? null : row.mentorFeedback,
      },
    });
  }

  async staffCorrect(
    id: string,
    body: UpdateWorkplaceLogDto & { reason: string },
    user?: AuthUser,
  ) {
    if (!user?.userId) throw new BadRequestException('Authentication required');
    if (!isStaffUser(user) || isLearnerOnly(user)) {
      throw new ForbiddenException('Only staff may apply workplace log corrections');
    }
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 8) {
      throw new BadRequestException('A staff correction requires a reason of at least 8 characters');
    }
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.workplaceLog.findFirst({
      where: {
        id,
        deletedAt: null,
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...enrollmentActorWhere(user),
        },
      },
    });
    if (!row) throw new NotFoundException('Workplace log not found');
    if (row.mentorStatus === 'VERIFIED') {
      throw new BadRequestException('Verified logs cannot be corrected');
    }
    const updated = await this.prisma.workplaceLog.update({
      where: { id },
      data: {
        ...(body.logDate ? { logDate: new Date(body.logDate) } : {}),
        ...(body.hoursWorked !== undefined ? { hoursWorked: body.hoursWorked } : {}),
        ...(body.activity ? { activity: body.activity } : {}),
        ...(body.supervisorName ? { supervisorName: body.supervisorName } : {}),
        ...(body.supervisorEmail !== undefined
          ? { supervisorEmail: body.supervisorEmail }
          : {}),
        mentorStatus: 'PENDING',
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organisationId,
        actorId: user.userId,
        entityType: 'WorkplaceLog',
        entityId: id,
        action: 'STAFF_CORRECTION',
        beforeValue: {
          activity: row.activity,
          hoursWorked: row.hoursWorked,
          mentorStatus: row.mentorStatus,
        },
        afterValue: {
          reason,
          activity: updated.activity,
          hoursWorked: updated.hoursWorked,
          mentorStatus: updated.mentorStatus,
        },
      },
    });
    return updated;
  }

  async resubmit(id: string, user?: AuthUser) {
    return this.update(id, {}, user);
  }

  async mentorVerify(
    id: string,
    body: { decision: 'approve' | 'reject'; feedback?: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    if (!user.roleCodes.includes('MENTOR')) {
      throw new BadRequestException('Only the allocated workplace mentor may verify logs');
    }
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
