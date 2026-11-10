import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto.js';
import { PaginationResponseDto } from '../../common/api-response.dto.js';

export class GameResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ maxLength: 200 })
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ minimum: 1 })
  minPlayers!: number;

  @ApiProperty({ minimum: 1 })
  maxPlayers!: number;

  @ApiProperty({ minimum: 0 })
  recommendedAge!: number;

  @ApiProperty({ minimum: 1 })
  durationMinutes!: number;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: CategoryResponseDto })
  category!: CategoryResponseDto;

  @ApiProperty({ minimum: 0, description: 'Copies available for borrowing' })
  availableCopies!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class GameListResponseDto {
  @ApiProperty({ type: [GameResponseDto] })
  data!: GameResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination!: PaginationResponseDto;
}
