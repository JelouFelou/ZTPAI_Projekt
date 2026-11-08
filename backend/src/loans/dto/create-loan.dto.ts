import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gameCopyId!: string;
}
