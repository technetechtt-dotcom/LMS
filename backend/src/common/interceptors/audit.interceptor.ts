import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, from, map, mergeMap, Observable, of } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { redactAuditValue } from '../../audit/audit-redact';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

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
      mergeMap((afterValue) => {
        const safeAfter = redactAuditValue(afterValue ?? req.body);
        return from(
          this.prisma.auditLog.create({
            data: {
              organisationId: req.user?.organisationId,
              actorId: req.user?.userId,
              entityType: req.originalUrl,
              action: req.method,
              beforeValue: undefined,
              afterValue:
                safeAfter && typeof safeAfter === 'object'
                  ? (safeAfter as object)
                  : { value: safeAfter },
              ipAddress: req.ip,
              userAgent:
                typeof req.headers['user-agent'] === 'string'
                  ? req.headers['user-agent']
                  : undefined,
            },
          }),
        ).pipe(
          map(() => afterValue),
          catchError((err) => {
            this.logger.warn(`Failed to write audit log: ${err.message}`);
            return of(afterValue);
          }),
        );
      }),
    );
  }
}
