import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CopyStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateGameCopyDto {
  @ApiProperty({ maxLength: 64, example: 'CATAN-001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  inventoryCode!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gameId!: string;

  @ApiPropertyOptional({ enum: CopyStatus, default: CopyStatus.AVAILABLE })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(CopyStatus)
  status?: CopyStatus;
}
