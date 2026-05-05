import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapEnrollmentToLearnerApi,
  type EnrollmentWithRelations,
} from './learners.mapper';

export type LearnerListQuery = {
  search?: string;
  /** UI / API: `all` | `active` | `completed` | `on-track` | `at-risk` */
  status?: string;
  /** Programme UUID */
  programme?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class LearnersService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (!status || status === 'all' || status === 'completed' || status === 'active') {
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

  async list(filters: LearnerListQuery = {}) {
    const where: Prisma.EnrollmentWhereInput = { deletedAt: null };

    const programmeId = filters.programme?.trim();
    if (programmeId && programmeId !== 'all') {
      where.programmeId = programmeId;
    }

    const st = filters.status?.trim();
    if (st === 'completed') {
      where.status = 'COMPLETED';
    } else if (
      st === 'active' ||
      st === 'on-track' ||
      st === 'at-risk'
    ) {
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

  async byId(id: string) {
    const row = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null },
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
}
