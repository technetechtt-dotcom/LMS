import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './attendance.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { hashOpaqueToken } from '../common/crypto/token-crypto';

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

  async create(dto: CreateAttendanceDto, user?: AuthUser, sessionId?: string) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true, programmeId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Attendance');

    return this.prisma.attendance.create({
      data: {
        enrollmentId: dto.enrollmentId,
        sessionId,
        sessionDate: new Date(dto.sessionDate),
        status: dto.status,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  /**
   * QR check-in: token must match an open session; enrollment must belong to that
   * programme; one PRESENT per (session, enrollment).
   */
  async checkIn(
    sessionId: string,
    token: string,
    enrollmentId: string,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, organisationId },
    });
    if (!session || session.closedAt || session.expiresAt < new Date()) {
      throw new BadRequestException('Attendance session invalid or expired');
    }
    if (session.tokenHash !== hashOpaqueToken(token ?? '')) {
      throw new BadRequestException('Invalid session token');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        programmeId: session.programmeId,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true, programmeId: true },
    });
    if (!enrollment) {
      throw new BadRequestException(
        'Enrollment is not bound to this attendance session programme',
      );
    }
    assertEnrollmentAccess(user, enrollment, 'Attendance');

    const existing = await this.prisma.attendance.findFirst({
      where: { sessionId: session.id, enrollmentId: enrollment.id, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('Already checked in for this session');
    }

    try {
      return await this.prisma.attendance.create({
        data: {
          enrollmentId: enrollment.id,
          sessionId: session.id,
          sessionDate: new Date(),
          status: 'PRESENT',
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('Already checked in for this session');
      }
      throw err;
    }
  }

  async summary(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { organisationId },
      include: {
        checkIns: { where: { deletedAt: null } },
      },
    });
    const expectedCount = sessions.reduce(
      (sum, s) => sum + (s.expectedCount || 0),
      0,
    );
    const present = sessions.reduce(
      (sum, s) =>
        sum +
        s.checkIns.filter((c) => c.status === 'PRESENT' || c.status === 'LATE')
          .length,
      0,
    );
    const absent = sessions.reduce(
      (sum, s) =>
        sum + s.checkIns.filter((c) => c.status === 'ABSENT').length,
      0,
    );
    const excused = sessions.reduce(
      (sum, s) =>
        sum + s.checkIns.filter((c) => c.status === 'EXCUSED').length,
      0,
    );
    const denominator = expectedCount > 0 ? expectedCount : present + absent + excused;
    return {
      scheduledSessions: sessions.length,
      expectedCount,
      present,
      absent,
      excused,
      rate: denominator > 0 ? Math.round((present / denominator) * 1000) / 10 : 0,
    };
  }

  async closeSession(sessionId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, organisationId },
    });
    if (!session) throw new NotFoundException('Attendance session not found');
    if (session.closedAt) {
      throw new BadRequestException('Session already closed');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        deletedAt: null,
        programmeId: session.programmeId,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true },
    });
    const existing = await this.prisma.attendance.findMany({
      where: { sessionId: session.id, deletedAt: null },
      select: { enrollmentId: true },
    });
    const marked = new Set(existing.map((r) => r.enrollmentId));
    const missing = enrollments.filter((e) => !marked.has(e.id));
    if (missing.length) {
      await this.prisma.attendance.createMany({
        data: missing.map((e) => ({
          enrollmentId: e.id,
          sessionId: session.id,
          sessionDate: session.scheduledAt ?? new Date(),
          status: 'ABSENT' as const,
        })),
        skipDuplicates: true,
      });
    }
    await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: { closedAt: new Date() },
    });
    return this.summary(user);
  }
}
