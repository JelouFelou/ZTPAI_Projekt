import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';

const requestIdPattern = /^[a-zA-Z0-9._:-]{1,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const incomingId = request.header('x-request-id');
    const requestId =
      incomingId && requestIdPattern.test(incomingId)
        ? incomingId
        : randomUUID();
    const startedAt = performance.now();

    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    response.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          requestId,
          method: request.method,
          url: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        }),
      );
    });

    next();
  }
}
