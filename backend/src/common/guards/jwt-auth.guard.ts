import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { portalFromRequest } from '../../auth/auth-cookies';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../types/request-with-user';
import { PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.substring(7);
    try {
      const user = await this.jwt.verifyAsync<AuthUser>(token);
      if (
        !user.sessionId ||
        !user.portal ||
        user.portal !== portalFromRequest(req)
      ) {
        throw new UnauthorizedException('Session is not valid for this portal');
      }
      const session = await this.prisma.refreshToken.findFirst({
        where: {
          id: user.sessionId,
          userId: user.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!session) {
        throw new UnauthorizedException('Session has ended');
      }
      req.user = user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
