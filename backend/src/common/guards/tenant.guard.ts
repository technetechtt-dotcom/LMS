import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { user?: { organisationId?: string }; headers: Record<string, string> }
    >();

    if (!req.user) return true;

    const orgHeader = req.headers['x-organisation-id'];
    if (!orgHeader) return true;

    if (req.user.organisationId && req.user.organisationId !== orgHeader) {
      throw new ForbiddenException('Cross-organisation access is forbidden');
    }

    req.user.organisationId = orgHeader;
    return true;
  }
}
