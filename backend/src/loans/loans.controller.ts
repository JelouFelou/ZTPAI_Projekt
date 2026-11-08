import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorEnvelopeDto } from '../common/api-response.dto.js';
import {
  ApiRequestIdHeader,
  ApiStandardServerError,
} from '../common/swagger.decorators.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { LoanResponseDto } from './dto/loan-response.dto.js';
import { LoansService } from './loans.service.js';

@Controller('loans')
@ApiTags('Loans')
@ApiRequestIdHeader()
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Borrow an available game copy' })
  @ApiCreatedResponse({ type: LoanResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiConflictResponse({
    type: ApiErrorEnvelopeDto,
    description:
      'The user has an overdue or active loan, or the game copy is unavailable',
  })
  @ApiNotFoundResponse({
    type: ApiErrorEnvelopeDto,
    description: 'Game copy not found',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  borrow(@CurrentUser() user: AuthUser, @Body() dto: CreateLoanDto) {
    return this.loans.borrow(user.id, dto);
  }
}
