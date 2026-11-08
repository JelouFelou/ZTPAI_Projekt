import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { toLoanResponse } from './loan.mapper.js';

const LOAN_DURATION_DAYS = 14;
const MAX_ACTIVE_LOANS = 1;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const loanResponse = {
  gameCopy: {
    select: {
      id: true,
      inventoryCode: true,
      game: { select: { id: true, title: true } },
    },
  },
} as const;

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async borrow(userId: string, dto: CreateLoanDto) {
    const overdueLoan = await this.prisma.loan.findFirst({
      where: {
        userId,
        status: LoanStatus.ACTIVE,
        dueAt: { lt: new Date() },
      },
      select: { id: true },
    });

    if (overdueLoan) {
      throw new ConflictException(
        'An overdue loan must be returned before borrowing another game',
      );
    }

    const activeLoanCount = await this.prisma.loan.count({
      where: { userId, status: LoanStatus.ACTIVE },
    });

    if (activeLoanCount >= MAX_ACTIVE_LOANS) {
      throw new ConflictException(
        `A user may have at most ${MAX_ACTIVE_LOANS} active loan`,
      );
    }

    const gameCopy = await this.prisma.gameCopy.findUnique({
      where: { id: dto.gameCopyId },
      select: { id: true, status: true },
    });

    if (!gameCopy) {
      throw new NotFoundException('Game copy not found');
    }

    if (gameCopy.status !== 'AVAILABLE') {
      throw new ConflictException('Game copy is not available');
    }

    const activeCopyLoan = await this.prisma.loan.findFirst({
      where: {
        gameCopyId: gameCopy.id,
        status: LoanStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (activeCopyLoan) {
      throw new ConflictException('Game copy is already borrowed');
    }

    const borrowedAt = new Date();
    const dueAt = new Date(
      borrowedAt.getTime() + LOAN_DURATION_DAYS * MILLISECONDS_PER_DAY,
    );
    const loan = await this.prisma.loan.create({
      data: {
        userId,
        gameCopyId: gameCopy.id,
        borrowedAt,
        dueAt,
      },
      include: loanResponse,
    });

    return toLoanResponse(loan);
  }
}
