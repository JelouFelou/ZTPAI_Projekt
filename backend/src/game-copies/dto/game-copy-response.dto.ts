import { ApiProperty } from '@nestjs/swagger';

export class GameCopyGameResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;
}

export class GameCopyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  inventoryCode!: string;

  @ApiProperty({ enum: ['AVAILABLE', 'MAINTENANCE', 'RETIRED'] })
  status!: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';

  @ApiProperty({ format: 'uuid' })
  gameId!: string;

  @ApiProperty({ type: GameCopyGameResponseDto })
  game!: GameCopyGameResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
