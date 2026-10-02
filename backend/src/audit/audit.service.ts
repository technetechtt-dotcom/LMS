import { BadRequestException, Injectable } from '@nestjs/common';
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

  listFindings(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.auditorFinding.findMany({
      where: { organisationId },
      include: { auditor: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createFinding(
    body: {
      scopeType?: string;
      scopeId?: string;
      finding?: string;
      severity?: string;
      evidenceDocumentIds?: string[];
    },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId || !body.finding?.trim() || !body.scopeType?.trim()) {
      throw new BadRequestException('scopeType and finding are required');
    }
    const severity = body.severity?.trim().toUpperCase() || 'MEDIUM';
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      throw new BadRequestException('Invalid finding severity');
    }
    const evidenceDocumentIds = [...new Set(body.evidenceDocumentIds ?? [])];
    if (evidenceDocumentIds.length) {
      const visible = await this.prisma.document.count({
        where: { id: { in: evidenceDocumentIds }, organisationId, deletedAt: null },
      });
      if (visible !== evidenceDocumentIds.length) {
        throw new BadRequestException('Finding evidence is not available in this organisation');
      }
    }
    return this.prisma.auditorFinding.create({
      data: {
        organisationId,
        auditorId: user.userId,
        scopeType: body.scopeType.trim(),
        scopeId: body.scopeId?.trim() || null,
        finding: body.finding.trim(),
        severity,
        evidenceDocumentIds,
      },
    });
  }
}
