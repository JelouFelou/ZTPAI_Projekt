import { ApiProperty } from '@nestjs/swagger';

export class PaginationResponseDto {
  @ApiProperty({ example: 1, minimum: 1 })
  page!: number;

  @ApiProperty({ example: 20, minimum: 1 })
  limit!: number;

  @ApiProperty({ example: 42, minimum: 0 })
  total!: number;

  @ApiProperty({ example: 3, minimum: 0 })
  totalPages!: number;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({ type: [String], required: false })
  details?: string[];

  @ApiProperty({ example: '7c8e8f36-b648-44cc-a9a8-823bb3107210' })
  requestId!: string;
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({ type: ApiErrorResponseDto })
  error!: ApiErrorResponseDto;
}
