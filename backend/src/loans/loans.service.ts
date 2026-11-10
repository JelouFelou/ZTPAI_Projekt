import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, Prisma } from '@prisma/client';
import { serializableTransaction } from '../common/serializable-transaction.js';
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
    try {
      return await serializableTransaction(this.prisma, (transaction) =>
        this.borrowInTransaction(transaction, userId, dto),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Game copy is already borrowed');
      }
      throw error;
    }
  }

  private async borrowInTransaction(
    prisma: Prisma.TransactionClient,
    userId: string,
    dto: CreateLoanDto,
  ) {
    const borrowedAt = new Date();
    const overdueLoan = await prisma.loan.findFirst({
      where: {
        userId,
        status: LoanStatus.ACTIVE,
        dueAt: { lt: borrowedAt },
      },
      select: { id: true },
    });

    if (overdueLoan) {
      throw new ConflictException(
        'An overdue loan must be returned before borrowing another game',
      );
    }

    const activeLoanCount = await prisma.loan.count({
      where: { userId, status: LoanStatus.ACTIVE },
    });

    if (activeLoanCount >= MAX_ACTIVE_LOANS) {
      throw new ConflictException(
        `A user may have at most ${MAX_ACTIVE_LOANS} active loan`,
      );
    }

    const gameCopy = await prisma.gameCopy.findUnique({
      where: { id: dto.gameCopyId },
      select: { id: true, status: true },
    });

    if (!gameCopy) {
      throw new NotFoundException('Game copy not found');
    }

    if (gameCopy.status !== 'AVAILABLE') {
      throw new ConflictException('Game copy is not available');
    }

    const activeCopyLoan = await prisma.loan.findFirst({
      where: {
        gameCopyId: gameCopy.id,
        status: LoanStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (activeCopyLoan) {
      throw new ConflictException('Game copy is already borrowed');
    }

    const dueAt = new Date(
      borrowedAt.getTime() + LOAN_DURATION_DAYS * MILLISECONDS_PER_DAY,
    );
    const loan = await prisma.loan.create({
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
