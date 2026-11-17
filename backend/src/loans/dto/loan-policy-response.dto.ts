import { ApiProperty } from '@nestjs/swagger';

export class LoanPolicyResponseDto {
  @ApiProperty({ minimum: 1, example: 14 })
  durationDays!: number;

  @ApiProperty({ minimum: 1, example: 1 })
  maxActiveLoans!: number;
}
