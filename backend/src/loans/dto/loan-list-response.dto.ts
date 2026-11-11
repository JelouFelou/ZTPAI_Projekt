import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponseDto } from '../../common/api-response.dto.js';
import { LoanResponseDto } from './loan-response.dto.js';

export class LoanBorrowerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class AdminLoanResponseDto extends LoanResponseDto {
  @ApiProperty({ type: LoanBorrowerResponseDto })
  user!: LoanBorrowerResponseDto;
}

export class LoanListResponseDto {
  @ApiProperty({ type: [LoanResponseDto] })
  data!: LoanResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination!: PaginationResponseDto;
}

export class AdminLoanListResponseDto {
  @ApiProperty({ type: [AdminLoanResponseDto] })
  data!: AdminLoanResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination!: PaginationResponseDto;
}
