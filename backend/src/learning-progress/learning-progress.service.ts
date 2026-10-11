import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LearningProgressKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { RecordLearningProgressDto } from './learning-progress.dto';

@Injectable()
export class LearningProgressService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadEnrollment(enrollmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true, programmeId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Learning progress');
    return { organisationId, enrollment };
  }

  async summary(enrollmentId: string, user?: AuthUser) {
    const { organisationId, enrollment } = await this.loadEnrollment(
      enrollmentId,
      user,
    );
    const [materials, rows] = await Promise.all([
      this.prisma.learningMaterial.findMany({
        where: {
          deletedAt: null,
          organisationId,
          isApproved: true,
          OR: [
            { programmeId: enrollment.programmeId },
            { programmeId: null },
          ],
        },
        select: {
          id: true,
          title: true,
          moduleKey: true,
          moduleLabel: true,
          moduleCode: true,
        },
      }),
      this.prisma.learningProgress.findMany({
        where: { enrollmentId },
      }),
    ]);

    const completed = new Set(
      rows
        .filter((r) => r.kind === 'MATERIAL_COMPLETED' && r.materialId)
        .map((r) => r.materialId as string),
    );
    const read = new Set(
      rows
        .filter((r) => r.kind === 'MATERIAL_READ' && r.materialId)
        .map((r) => r.materialId as string),
    );
    const bookmarked = new Set(
      rows
        .filter((r) => r.kind === 'BOOKMARK' && r.materialId)
        .map((r) => r.materialId as string),
    );

    const byModule = new Map<
      string,
      { key: string; title: string; total: number; completed: number; read: number }
    >();
    for (const material of materials) {
      const key = material.moduleKey || material.moduleCode || material.moduleLabel || 'General';
      const current = byModule.get(key) ?? {
        key,
        title: material.moduleLabel || material.moduleCode || key,
        total: 0,
        completed: 0,
        read: 0,
      };
      current.total += 1;
      if (completed.has(material.id)) current.completed += 1;
      if (read.has(material.id) || completed.has(material.id)) current.read += 1;
      byModule.set(key, current);
    }

    const modules = Array.from(byModule.values()).map((mod) => ({
      ...mod,
      percent: mod.total ? Math.round((mod.completed / mod.total) * 100) : 0,
    }));

    return {
      enrollmentId,
      materials: materials.map((material) => ({
        id: material.id,
        title: material.title,
        moduleKey: material.moduleKey || material.moduleCode || material.moduleLabel || 'General',
        read: read.has(material.id) || completed.has(material.id),
        completed: completed.has(material.id),
        bookmarked: bookmarked.has(material.id),
      })),
      modules,
    };
  }

  async record(dto: RecordLearningProgressDto, user?: AuthUser) {
    const { organisationId, enrollment } = await this.loadEnrollment(
      dto.enrollmentId,
      user,
    );
    if (!dto.materialId && !dto.moduleKey) {
      throw new BadRequestException('materialId or moduleKey is required');
    }
    if (dto.materialId) {
      const material = await this.prisma.learningMaterial.findFirst({
        where: {
          id: dto.materialId,
          deletedAt: null,
          organisationId,
          OR: [
            { programmeId: enrollment.programmeId },
            { programmeId: null },
          ],
        },
        select: { id: true, moduleKey: true, moduleCode: true, moduleLabel: true, programmeId: true },
      });
      if (!material) {
        throw new BadRequestException(
          'Material does not belong to this programme and organisation',
        );
      }
      dto.moduleKey =
        dto.moduleKey ||
        material.moduleKey ||
        material.moduleCode ||
        material.moduleLabel ||
        undefined;
    }
    if (dto.materialId) {
      return this.prisma.learningProgress.upsert({
        where: {
          enrollmentId_materialId_kind: {
            enrollmentId: dto.enrollmentId,
            materialId: dto.materialId,
            kind: dto.kind,
          },
        },
        create: {
          enrollmentId: dto.enrollmentId,
          materialId: dto.materialId,
          moduleKey: dto.moduleKey,
          kind: dto.kind,
        },
        update: { moduleKey: dto.moduleKey },
      });
    }
    const existing = await this.prisma.learningProgress.findFirst({
      where: {
        enrollmentId: dto.enrollmentId,
        moduleKey: dto.moduleKey,
        kind: dto.kind,
        materialId: null,
      },
    });
    if (existing) return existing;
    return this.prisma.learningProgress.create({
      data: {
        enrollmentId: dto.enrollmentId,
        moduleKey: dto.moduleKey,
        kind: dto.kind,
      },
    });
  }

  kinds(): LearningProgressKind[] {
    return ['MATERIAL_READ', 'MATERIAL_COMPLETED', 'BOOKMARK'];
  }
}
