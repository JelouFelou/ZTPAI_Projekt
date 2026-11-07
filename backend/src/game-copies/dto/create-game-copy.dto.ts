import { Transform } from 'class-transformer';
import { CopyStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateGameCopyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  inventoryCode!: string;

  @IsUUID()
  gameId!: string;

  @IsOptional()
  @IsEnum(CopyStatus)
  status?: CopyStatus;
}
