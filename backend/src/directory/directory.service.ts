import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import type { DirectoryQueryDto } from './directory.dto';

const STAFF = ['ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'QA_OFFICER', 'MENTOR', 'SETA'];

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  private requestedRoles(user: AuthUser | undefined, raw?: string): string[] {
    const requested = (raw ?? '')
      .split(',')
      .map((role) => role.trim().toUpperCase())
      .filter((role) => STAFF.includes(role));
    const own = user?.roleCodes ?? [];
    let allowed: string[];
    if (own.some((r) => ['ADMIN', 'PLATFORM_ADMIN'].includes(r))) allowed = STAFF;
    else if (own.includes('QA_OFFICER')) allowed = ['ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'MENTOR', 'SETA'];
    else if (own.includes('FACILITATOR')) allowed = ['ASSESSOR', 'MODERATOR', 'MENTOR', 'QA_OFFICER'];
    else if (own.includes('ASSESSOR')) allowed = ['MODERATOR', 'QA_OFFICER'];
    else if (own.includes('MODERATOR')) allowed = ['ASSESSOR', 'QA_OFFICER'];
    else if (own.includes('SETA')) allowed = ['ADMIN', 'QA_OFFICER'];
    else if (own.includes('MENTOR')) allowed = ['ADMIN', 'FACILITATOR'];
    else throw new ForbiddenException('Learners cannot enumerate the staff directory');
    return (requested.length ? requested : allowed).filter((r) => allowed.includes(r));
  }

  private async page(
    organisationId: string,
    query: DirectoryQueryDto,
    extraWhere: Prisma.UserWhereInput,
  ) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...extraWhere,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true,
          passwordSetAt: true,
          memberships: {
            where: { organisationId, deletedAt: null },
            select: { role: { select: { code: true } } },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: `${row.firstName} ${row.lastName}`.trim(),
        role: row.memberships[0]?.role.code ?? 'UNKNOWN',
        status: !row.isActive ? 'INACTIVE' : row.passwordSetAt ? 'ACTIVE' : 'PENDING_ACTIVATION',
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  staff(user: AuthUser | undefined, query: DirectoryQueryDto) {
    const organisationId = requireOrganisationId(user);
    const roles = this.requestedRoles(user, query.roles);
    return this.page(organisationId, query, {
      memberships: { some: { organisationId, deletedAt: null, role: { code: { in: roles } } } },
    });
  }

  async messageRecipients(user: AuthUser | undefined, query: DirectoryQueryDto) {
    const organisationId = requireOrganisationId(user);
    const actorId = user?.userId;
    if (!actorId) throw new ForbiddenException('Authentication required');
    const roles = user?.roleCodes ?? [];
    if (roles.some((r) => ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER', 'SETA'].includes(r))) {
      return this.page(organisationId, query, {
        id: { not: actorId },
        memberships: { some: { organisationId, deletedAt: null } },
      });
    }

    const permitted = new Set<string>();
    if (roles.includes('LEARNER')) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { learnerId: actorId, deletedAt: null, sdioOrganisationId: organisationId },
        select: {
          metadata: true,
          assessments: { select: { assessorId: true, moderatorId: true } },
        },
      });
      for (const enrollment of enrollments) {
        const meta = (enrollment.metadata as Record<string, unknown> | null) ?? {};
        for (const id of [meta.facilitatorId, meta.workplaceMentorId]) {
          if (typeof id === 'string') permitted.add(id);
        }
        for (const assessment of enrollment.assessments) {
          permitted.add(assessment.assessorId);
          if (assessment.moderatorId) permitted.add(assessment.moderatorId);
        }
      }
    } else if (roles.includes('MENTOR')) {
      const learners = await this.prisma.enrollment.findMany({
        where: {
          deletedAt: null,
          sdioOrganisationId: organisationId,
          metadata: { path: ['workplaceMentorId'], equals: actorId },
        },
        select: { learnerId: true },
      });
      learners.forEach((row) => permitted.add(row.learnerId));
    } else {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          deletedAt: null,
          sdioOrganisationId: organisationId,
          OR: [
            { metadata: { path: ['facilitatorId'], equals: actorId } },
            { assessments: { some: { assessorId: actorId } } },
            { assessments: { some: { moderatorId: actorId } } },
          ],
        },
        select: { learnerId: true },
      });
      enrollments.forEach((row) => permitted.add(row.learnerId));
    }
    return this.page(organisationId, query, {
      id: { in: [...permitted] },
      memberships: { some: { organisationId, deletedAt: null } },
    });
  }

  async mentors(user: AuthUser | undefined, query: DirectoryQueryDto) {
    const organisationId = requireOrganisationId(user);
    const roles = user?.roleCodes ?? [];
    if (roles.includes('LEARNER')) {
      const rows = await this.prisma.enrollment.findMany({
        where: { learnerId: user!.userId, sdioOrganisationId: organisationId, deletedAt: null },
        select: { metadata: true },
      });
      const ids = rows
        .map((r) => (r.metadata as Record<string, unknown> | null)?.workplaceMentorId)
        .filter((id): id is string => typeof id === 'string');
      return this.page(organisationId, query, { id: { in: ids } });
    }
    if (roles.includes('MENTOR') && !roles.some((r) => ['ADMIN', 'QA_OFFICER', 'FACILITATOR'].includes(r))) {
      return this.page(organisationId, query, { id: user?.userId });
    }
    return this.staff(user, { ...query, roles: 'MENTOR' });
  }
}
