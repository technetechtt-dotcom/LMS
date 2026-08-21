import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../types/request-with-user';

/** Canonical organisation header (also accepts aliases). */
export const ORG_HEADER_PRIMARY = 'x-organisation-id';
export const ORG_HEADER_ALIASES = [
  'x-organisation-id',
  'x-org-id',
  'x-tenant-id',
] as const;

export function readOrganisationHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  for (const key of ORG_HEADER_ALIASES) {
    const raw = headers[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function requireOrganisationId(user?: AuthUser | null): string {
  const orgId = user?.organisationId?.trim();
  if (!orgId) {
    throw new ForbiddenException(
      'Organisation context is required for this resource',
    );
  }
  return orgId;
}

export function isPlatformAdmin(user?: AuthUser | null): boolean {
  return Boolean(user?.roleCodes?.includes('ADMIN'));
}
