import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgEnrollmentWhere(organisationId: string) {
    return {
      deletedAt: null as null,
      OR: [
        { sdioOrganisationId: organisationId },
        { employerOrganisationId: organisationId },
        { programme: { organisationId } },
      ],
    };
  }

  async learnershipProgress(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const grouped = await this.prisma.enrollment.groupBy({
      by: ['status'],
      where: this.orgEnrollmentWhere(organisationId),
      _count: { status: true },
    });
    return grouped;
  }

  async learnerPoe(enrollmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        ...this.orgEnrollmentWhere(organisationId),
      },
      select: { id: true },
    });
    if (!enrollment) return [];
    return this.prisma.evidence.findMany({
      where: { enrollmentId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async setaSnapshot(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const [enrollments, docs, assessments] = await Promise.all([
      this.prisma.enrollment.count({
        where: this.orgEnrollmentWhere(organisationId),
      }),
      this.prisma.document.count({
        where: { deletedAt: null, organisationId },
      }),
      this.prisma.assessment.count({
        where: {
          deletedAt: null,
          enrollment: this.orgEnrollmentWhere(organisationId),
        },
      }),
    ]);
    return {
      enrollments,
      docs,
      assessments,
      generatedAt: new Date().toISOString(),
    };
  }
}
