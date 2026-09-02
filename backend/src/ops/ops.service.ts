import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  isPlatformAdmin,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user?: AuthUser) {
    if (isPlatformAdmin(user)) {
      const [
        organisations,
        users,
        programmes,
        materials,
        pendingInvitations,
        activeEnrollments,
      ] = await Promise.all([
        this.prisma.organisation.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.programme.count(),
        this.prisma.learningMaterial.count({ where: { deletedAt: null } }),
        this.prisma.invitation.count({
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
        }),
        this.prisma.enrollment.count({
          where: { deletedAt: null, status: { not: 'COMPLETED' } },
        }),
      ]);
      return {
        scope: 'platform' as const,
        organisations,
        users,
        programmes,
        materials,
        pendingInvitations,
        activeEnrollments,
      };
    }

    const organisationId = requireOrganisationId(user);
    const [
      users,
      programmes,
      materials,
      pendingInvitations,
      activeEnrollments,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          deletedAt: null,
          memberships: {
            some: { organisationId, deletedAt: null },
          },
        },
      }),
      this.prisma.programme.count({ where: { organisationId } }),
      this.prisma.learningMaterial.count({
        where: {
          deletedAt: null,
          programme: { organisationId },
        },
      }),
      this.prisma.invitation.count({
        where: {
          organisationId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.enrollment.count({
        where: {
          deletedAt: null,
          status: { not: 'COMPLETED' },
          OR: [
            { sdioOrganisationId: organisationId },
            { programme: { organisationId } },
          ],
        },
      }),
    ]);

    return {
      scope: 'organisation' as const,
      organisations: 1,
      users,
      programmes,
      materials,
      pendingInvitations,
      activeEnrollments,
    };
  }

  listInvitations(user?: AuthUser) {
    if (isPlatformAdmin(user)) {
      return this.prisma.invitation.findMany({
        where: { status: 'PENDING' },
        include: {
          organisation: { select: { id: true, name: true } },
          role: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    const organisationId = requireOrganisationId(user);
    return this.prisma.invitation.findMany({
      where: { organisationId, status: 'PENDING' },
      include: {
        organisation: { select: { id: true, name: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
