import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { redactAuditValue } from './audit-redact';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(limit = 100, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.auditLog.findMany({
      where: { organisationId },
      take: Math.min(limit, 500),
      orderBy: { createdAt: 'desc' },
    });
  }

  async writeLog(
    entry: {
      action: string;
      entity?: string;
      entityType?: string;
      entityId?: string;
      details?: string;
      afterValue?: unknown;
    },
    user?: AuthUser,
  ) {
    const organisationId = user?.organisationId;
    await this.prisma.auditLog.create({
      data: {
        organisationId: organisationId || undefined,
        actorId: user?.userId,
        entityType: entry.entityType ?? entry.entity ?? 'App',
        entityId: entry.entityId,
        action: entry.action,
        afterValue: redactAuditValue({
          details: entry.details,
          ...(typeof entry.afterValue === 'object' && entry.afterValue
            ? (entry.afterValue as object)
            : {}),
        }) as object,
      },
    });
    return { success: true as const };
  }
}
