import { applyDecorators } from '@nestjs/common';
import {
  ApiHeader,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ApiErrorEnvelopeDto } from './api-response.dto.js';

export function ApiRequestIdHeader(): ClassDecorator {
  return ApiHeader({
    name: 'X-Request-Id',
    required: false,
    description: 'Optional request correlation ID; generated when omitted or invalid.',
  });
}

export function ApiStandardServerError(): MethodDecorator {
  return applyDecorators(
    ApiInternalServerErrorResponse({ type: ApiErrorEnvelopeDto }),
  );
}
