import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ADMIN_ONLY_ENDPOINT_KEY } from '../decorators/admin-only-endpoint.decorator';
import { PUBLIC_KEY } from '../decorators/public.decorator';

/** When ADMIN_ENDPOINTS_ENABLED is false, blocks handlers marked @AdminOnlyEndpoint(). */
@Injectable()
export class AdminEndpointsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_ENDPOINT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!adminOnly) return true;

    const raw = this.config.get<string>('ADMIN_ENDPOINTS_ENABLED') ?? 'true';
    const enabled = raw.trim().toLowerCase() !== 'false';
    if (!enabled) {
      throw new ForbiddenException('Admin maintenance endpoints are disabled');
    }
    return true;
  }
}
