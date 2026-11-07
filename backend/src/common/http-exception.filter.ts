import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: string[];
    requestId: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId =
      typeof response.locals.requestId === 'string'
        ? response.locals.requestId
        : 'unknown';
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception for ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body = this.createErrorBody(exception, status, requestId);
    response.status(status).json(body);
  }

  private createErrorBody(
    exception: unknown,
    status: number,
    requestId: string,
  ): ApiErrorBody {
    if (
      !(exception instanceof HttpException) ||
      status >= HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      return {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          requestId,
        },
      };
    }

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : 'message' in exceptionResponse
          ? exceptionResponse.message
          : undefined;
    const details = Array.isArray(message)
      ? message.filter((item): item is string => typeof item === 'string')
      : undefined;
    const code = this.getErrorCode(status, details !== undefined);
    const fallbackMessage =
      typeof message === 'string' ? message : exception.message;

    return {
      error: {
        code,
        message: details ? 'Validation failed' : fallbackMessage,
        ...(details ? { details } : {}),
        requestId,
      },
    };
  }

  private getErrorCode(status: number, validationError: boolean): string {
    if (validationError) {
      return 'VALIDATION_ERROR';
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'INTERNAL_SERVER_ERROR'
          : 'HTTP_ERROR';
    }
  }
}
