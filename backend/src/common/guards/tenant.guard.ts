import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../types/request-with-user';
import {
  readOrganisationHeader,
  resolveRoleCodesForTenant,
} from '../tenant/tenant-scope';

/**
 * Resolves organisation context and **tenant-specific roles**.
 * JWT may contain roles from every membership; authorization uses only
 * roles for the active organisation (plus global PLATFORM_ADMIN).
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

    const [orgMemberships, platformMembership] = await Promise.all([
      this.prisma.userOrganisation.findMany({
        where: {
          userId: req.user.userId,
          organisationId: targetOrg,
          deletedAt: null,
          user: { deletedAt: null, isActive: true },
        },
        include: { role: { select: { code: true } } },
      }),
      this.prisma.userOrganisation.findFirst({
        where: {
          userId: req.user.userId,
          deletedAt: null,
          role: { code: 'PLATFORM_ADMIN', deletedAt: null },
          user: { deletedAt: null, isActive: true },
        },
        select: { id: true },
      }),
    ]);

    const isPlatform = Boolean(platformMembership);
    if (!orgMemberships.length && !isPlatform) {
      throw new ForbiddenException('Cross-organisation access is forbidden');
    }

    req.user.organisationId = targetOrg;
    req.user.roleCodes = resolveRoleCodesForTenant({
      organisationRoleCodes: orgMemberships.map((m) => m.role.code),
      isPlatformAdmin: isPlatform,
    });
    return true;
  }
}
