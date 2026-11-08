import { ApiProperty } from '@nestjs/swagger';

export class LoanGameResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;
}

export class LoanGameCopyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  inventoryCode!: string;

  @ApiProperty({ type: LoanGameResponseDto })
  game!: LoanGameResponseDto;
}

export class LoanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['ACTIVE', 'RETURNED'] })
  status!: 'ACTIVE' | 'RETURNED';

  @ApiProperty({ format: 'date-time' })
  borrowedAt!: string;

  @ApiProperty({ format: 'date-time' })
  dueAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  returnedAt!: string | null;

  @ApiProperty({ type: LoanGameCopyResponseDto })
  gameCopy!: LoanGameCopyResponseDto;
}
