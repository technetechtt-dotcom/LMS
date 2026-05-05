import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<
      Request & {
        user?: { userId?: string; organisationId?: string };
        method: string;
        originalUrl: string;
        body?: unknown;
        ip?: string;
        headers: Record<string, string | string[] | undefined>;
      }
    >();

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next.handle();
    }

    const url = typeof req.originalUrl === 'string' ? req.originalUrl : '';
    if (url.startsWith('/auth')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (afterValue) => {
        await this.prisma.auditLog.create({
          data: {
            organisationId: req.user?.organisationId,
            actorId: req.user?.userId,
            entityType: req.originalUrl,
            action: req.method,
            beforeValue: undefined,
            afterValue: (afterValue ?? req.body) as object,
            ipAddress: req.ip,
            userAgent:
              typeof req.headers['user-agent'] === 'string'
                ? req.headers['user-agent']
                : undefined,
          },
        });
      }),
    );
  }
}
