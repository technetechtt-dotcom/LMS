import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapEnrollmentToLearnerApi,
  type EnrollmentWithRelations,
} from './learners.mapper';
import type { CreateLearnerDto, UpdateLearnerDto } from './learners.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentActorWhere,
  isFacilitatorOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

export type LearnerListQuery = {
  search?: string;
  status?: string;
  programme?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class LearnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private async assessmentStatsForEnrollmentIds(
    enrollmentIds: string[],
  ): Promise<Map<string, { total: number; competent: number }>> {
    const map = new Map<string, { total: number; competent: number }>();
    if (!enrollmentIds.length) return map;

    const [totals, competentRows] = await Promise.all([
      this.prisma.assessment.groupBy({
        by: ['enrollmentId'],
        where: {
          deletedAt: null,
          enrollmentId: { in: enrollmentIds },
        },
        _count: { _all: true },
      }),
      this.prisma.assessment.groupBy({
        by: ['enrollmentId'],
        where: {
          deletedAt: null,
          result: 'C',
          enrollmentId: { in: enrollmentIds },
        },
        _count: { _all: true },
      }),
    ]);

    for (const id of enrollmentIds) {
      map.set(id, { total: 0, competent: 0 });
    }
    for (const row of totals) {
      const cur = map.get(row.enrollmentId);
      if (cur) cur.total = row._count._all;
    }
    for (const row of competentRows) {
      const cur = map.get(row.enrollmentId);
      if (cur) cur.competent = row._count._all;
    }
    return map;
  }

  private postFilterMappedByUiStatus(
    rows: Record<string, unknown>[],
    status?: string,
  ): Record<string, unknown>[] {
    if (
      !status ||
      status === 'all' ||
      status === 'completed' ||
      status === 'active'
    ) {
      return rows;
    }
    if (status === 'at-risk') {
      return rows.filter((row) => {
        const progress = row.progress as number;
        const st = row.status as string;
        return st === 'at_risk' || progress < 50;
      });
    }
    if (status === 'on-track') {
      return rows.filter((row) => {
        const progress = row.progress as number;
        const st = row.status as string;
        if (st === 'at_risk' || progress < 50) return false;
        return progress >= 80;
      });
    }
    return rows;
  }

  private orgScope(organisationId: string): Prisma.EnrollmentWhereInput {
    return {
      OR: [
        { sdioOrganisationId: organisationId },
        { employerOrganisationId: organisationId },
        { programme: { organisationId } },
      ],
    };
  }

  async list(
    filters: LearnerListQuery = {},
    organisationId?: string,
    user?: AuthUser,
  ) {
    const where: Prisma.EnrollmentWhereInput = { deletedAt: null };

    if (organisationId) {
      Object.assign(where, this.orgScope(organisationId));
    }
    Object.assign(where, enrollmentActorWhere(user));

    const programmeId = filters.programme?.trim();
    if (programmeId && programmeId !== 'all') {
      where.programmeId = programmeId;
    }

    const st = filters.status?.trim();
    if (st === 'completed') {
      where.status = 'COMPLETED';
    } else if (st === 'active' || st === 'on-track' || st === 'at-risk') {
      where.status = { not: 'COMPLETED' };
    }

    const search = filters.search?.trim();
    if (search) {
      where.learner = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.dateFrom) {
        const d = new Date(filters.dateFrom);
        d.setHours(0, 0, 0, 0);
        createdAt.gte = d;
      }
      if (filters.dateTo) {
        const d = new Date(filters.dateTo);
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
      where.createdAt = createdAt;
    }

    const rows = await this.prisma.enrollment.findMany({
      where,
      include: {
        learner: true,
        programme: {
          include: { qualification: true, organisation: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await this.assessmentStatsForEnrollmentIds(
      rows.map((r) => r.id),
    );

    let mapped = rows.map((r) =>
      mapEnrollmentToLearnerApi(
        r as EnrollmentWithRelations,
        stats.get(r.id) ?? { total: 0, competent: 0 },
      ),
    );

    if (st && st !== 'all') {
      mapped = this.postFilterMappedByUiStatus(mapped, st);
    }

    return mapped;
  }

  async byId(id: string, organisationId?: string, user?: AuthUser) {
    const where: Prisma.EnrollmentWhereInput = { id, deletedAt: null };
    if (organisationId) {
      Object.assign(where, this.orgScope(organisationId));
    }
    Object.assign(where, enrollmentActorWhere(user));
    const row = await this.prisma.enrollment.findFirst({
      where,
      include: {
        learner: true,
        programme: {
          include: { qualification: true, organisation: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Learner enrolment not found');

    const stats = await this.assessmentStatsForEnrollmentIds([row.id]);
    return mapEnrollmentToLearnerApi(
      row as EnrollmentWithRelations,
      stats.get(row.id) ?? { total: 0, competent: 0 },
    );
  }

  async create(dto: CreateLearnerDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: dto.programmeId, deletedAt: null, organisationId },
    });
    if (!programme) {
      throw new BadRequestException('Programme not found in your organisation');
    }

    if (isFacilitatorOnly(user)) {
      const now = new Date();
      const assignment = await this.prisma.facilitatorAssignment.findFirst({
        where: {
          programmeId: dto.programmeId,
          facilitatorId: user?.userId,
          organisationId,
          isActive: true,
          deletedAt: null,
          moduleId: null, // module-only assignments cannot create whole programme learners
          learnerId: null, // learner-only assignments cannot create other learners
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'Facilitators cannot create learners outside their assigned programmes',
        );
      }
    }

    const email = dto.email.toLowerCase().trim();
    let firstName = dto.firstName?.trim();
    let lastName = dto.lastName?.trim();
    if ((!firstName || !lastName) && dto.name?.trim()) {
      const parts = dto.name.trim().split(/\s+/);
      firstName = firstName || parts[0];
      lastName = lastName || parts.slice(1).join(' ') || parts[0];
    }
    if (!firstName || !lastName) {
      throw new BadRequestException('firstName/lastName or name is required');
    }

    const learnerRole = await this.prisma.role.findFirst({
      where: { code: 'LEARNER' },
    });
    if (!learnerRole) {
      throw new BadRequestException('LEARNER role is not seeded');
    }

    return this.users.create({
      email,
      firstName,
      lastName,
      roleId: learnerRole.id,
      programmeId: dto.programmeId,
      enrollmentMetadata: {
        idNumber: dto.idNumber,
        phone: dto.phone,
        progress: dto.progress ?? 0,
        setaStatus: 'pending',
      },
    }, user);
  }

  async update(id: string, dto: UpdateLearnerDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.orgScope(organisationId),
        ...enrollmentActorWhere(user),
      },
      include: {
        learner: true,
        programme: {
          include: {
            facilitatorAssignments: {
              where: { deletedAt: null, isActive: true },
              include: { module: true },
            },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Learner enrolment not found');
    assertEnrollmentAccess(user, existing, 'Learner');

    if (dto.programmeId && dto.programmeId !== existing.programmeId && isFacilitatorOnly(user)) {
      const now = new Date();
      const targetAssignment = await this.prisma.facilitatorAssignment.findFirst({
        where: {
          programmeId: dto.programmeId,
          facilitatorId: user?.userId,
          organisationId,
          isActive: true,
          deletedAt: null,
          moduleId: null,
          learnerId: null,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
      });
      if (!targetAssignment) {
        throw new ForbiddenException(
          'Facilitators cannot transfer learners to unassigned programmes',
        );
      }
    }

    let firstName = dto.firstName;
    let lastName = dto.lastName;
    if (dto.name?.trim() && !firstName && !lastName) {
      const parts = dto.name.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || parts[0];
    }

    const meta = {
      ...((existing.metadata as Record<string, unknown> | null) ?? {}),
      ...(dto.idNumber !== undefined ? { idNumber: dto.idNumber } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
      ...(dto.setaStatus !== undefined ? { setaStatus: dto.setaStatus } : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      if (firstName || lastName || dto.email) {
        await tx.user.update({
          where: { id: existing.learnerId },
          data: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(dto.email ? { email: dto.email.toLowerCase().trim() } : {}),
          },
        });
      }
      if (dto.programmeId) {
        const programme = await tx.programme.findFirst({
          where: {
            id: dto.programmeId,
            deletedAt: null,
            organisationId,
          },
          select: { id: true },
        });
        if (!programme) {
          throw new BadRequestException(
            'Programme not found in your organisation',
          );
        }
      }
      await tx.enrollment.update({
        where: { id },
        data: {
          metadata: meta,
          ...(dto.programmeId ? { programmeId: dto.programmeId } : {}),
        },
      });
    });

    return this.byId(id, organisationId, user);
  }
}
