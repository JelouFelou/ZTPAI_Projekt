import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiServiceUnavailableResponse,
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
import { AdminOnly } from '../auth/admin-only.decorator.js';
import {
  AdminListLoansQueryDto,
  ListLoansQueryDto,
} from './dto/list-loans-query.dto.js';
import {
  AdminLoanListResponseDto,
  LoanListResponseDto,
} from './dto/loan-list-response.dto.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { LoanResponseDto } from './dto/loan-response.dto.js';
import { LoansService } from './loans.service.js';

@Controller('loans')
@ApiTags('Loans')
@ApiRequestIdHeader()
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List your borrowing history, newest first' })
  @ApiOkResponse({ type: LoanListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  findMyHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: ListLoansQueryDto,
  ) {
    return this.loans.findMyHistory(user.id, query);
  }

  @Get()
  @AdminOnly()
  @ApiOperation({
    summary: 'List all borrowing history with borrower details, newest first',
  })
  @ApiOkResponse({ type: AdminLoanListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  findAllHistory(@Query() query: AdminListLoansQueryDto) {
    return this.loans.findAllHistory(query);
  }

  @Patch(':id/return')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return your own active loan' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: LoanResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({
    type: ApiErrorEnvelopeDto,
    description: 'Loan not found or belongs to another user',
  })
  @ApiConflictResponse({
    type: ApiErrorEnvelopeDto,
    description: 'Loan already returned or concurrent modification',
  })
  @ApiServiceUnavailableResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  returnLoan(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.loans.returnLoan(user.id, id);
  }

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
