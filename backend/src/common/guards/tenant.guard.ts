import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../types/request-with-user';
import { readOrganisationHeader } from '../tenant/tenant-scope';

/**
 * Resolves and enforces organisation context on authenticated requests.
 * Header (X-Organisation-Id / X-Org-Id / X-Tenant-ID) must match a membership
 * when provided; otherwise JWT primary organisationId is used.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | string[] | undefined>;
    }>();

    if (!req.user?.userId) return true;

    const headerOrg = readOrganisationHeader(req.headers);
    const jwtOrg = req.user.organisationId?.trim();
    const targetOrg = headerOrg || jwtOrg;

    if (!targetOrg) {
      throw new ForbiddenException(
        'Organisation context is required (membership or X-Organisation-Id header)',
      );
    }

    const membership = await this.prisma.userOrganisation.findFirst({
      where: {
        userId: req.user.userId,
        organisationId: targetOrg,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Cross-organisation access is forbidden');
    }

    req.user.organisationId = targetOrg;
    return true;
  }
}
