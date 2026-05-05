import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async learnershipProgress() {
    const grouped = await this.prisma.enrollment.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    return grouped;
  }

  async learnerPoe(enrollmentId: string) {
    return this.prisma.evidence.findMany({
      where: { enrollmentId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async setaSnapshot() {
    const [enrollments, docs, assessments] = await Promise.all([
      this.prisma.enrollment.count({ where: { deletedAt: null } }),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.assessment.count({ where: { deletedAt: null } }),
    ]);
    return { enrollments, docs, assessments, generatedAt: new Date().toISOString() };
  }
}
