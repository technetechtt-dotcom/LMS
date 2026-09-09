import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null && 'message' in body) {
        const m = (body as { message?: unknown }).message;
        message = typeof m === 'string' || Array.isArray(m) ? m : message;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      if (!isProd) {
        this.logger.error(exception.stack);
      }
    } else {
      this.logger.error(exception);
    }

    const payload: Record<string, unknown> = {
      success: false,
      statusCode: status,
      message,
      correlationId:
        req.headers['x-request-id'] ?? req.headers['x-correlation-id'],
      ...(isProd ? {} : { path: req.url }),
    };

    if (status >= 500) {
      process.stderr.write(`${JSON.stringify({
        level: 'error',
        event: 'http_exception',
        statusCode: status,
        method: req.method,
        path: req.path,
        correlationId: payload.correlationId,
        error: exception instanceof Error ? exception.name : 'UnknownError',
      })}\n`);
    }

    res.status(status).json(payload);
  }
}
