import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsInt()
  @Min(1)
  @Max(100)
  minPlayers!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  maxPlayers!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  recommendedAge!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;

  @IsUUID()
  categoryId!: string;
}
