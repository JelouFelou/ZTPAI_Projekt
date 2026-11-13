import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListLoansQueryDto {
  @ApiPropertyOptional({
    enum: LoanStatus,
    description: 'Omit to include active and returned loans',
  })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000000, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class AdminListLoansQueryDto extends ListLoansQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'true: active loans past dueAt; false: active loans not yet past dueAt. Incompatible with status=RETURNED.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by borrower' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
