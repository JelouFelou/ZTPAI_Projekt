import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, Prisma } from '@prisma/client';
import { serializableTransaction } from '../common/serializable-transaction.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { toLoanResponse } from './loan.mapper.js';
import {
  AdminListLoansQueryDto,
  ListLoansQueryDto,
} from './dto/list-loans-query.dto.js';
import type {
  AdminLoanListResponseDto,
  LoanListResponseDto,
} from './dto/loan-list-response.dto.js';

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

  async findMyHistory(
    userId: string,
    query: ListLoansQueryDto,
  ): Promise<LoanListResponseDto> {
    const { loans, pagination } = await this.findHistoryPage(
      { userId, ...(query.status ? { status: query.status } : {}) },
      query,
    );
    return { data: loans.map(toLoanResponse), pagination };
  }

  async findAllHistory(
    query: AdminListLoansQueryDto,
  ): Promise<AdminLoanListResponseDto> {
    if (query.status === LoanStatus.RETURNED && query.overdue !== undefined) {
      throw new BadRequestException(
        'The overdue filter cannot be combined with returned loans',
      );
    }
    const now = new Date();
    const { loans, pagination } = await this.findHistoryPage(
      {
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.overdue !== undefined
          ? {
              status: LoanStatus.ACTIVE,
              dueAt: query.overdue ? { lt: now } : { gte: now },
            }
          : query.status
            ? { status: query.status }
            : {}),
      },
      query,
    );
    return {
      data: loans.map((loan) => ({
        ...toLoanResponse(loan),
        user: {
          id: loan.user.id,
          email: loan.user.email,
          firstName: loan.user.firstName,
          lastName: loan.user.lastName,
        },
      })),
      pagination,
    };
  }

  private async findHistoryPage(
    where: Prisma.LoanWhereInput,
    query: ListLoansQueryDto,
  ) {
    const [loans, total] = await this.prisma.$transaction(
      [
        this.prisma.loan.findMany({
          where,
          include: {
            ...loanResponse,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ borrowedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.loan.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      loans,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async returnLoan(userId: string, loanId: string) {
    return serializableTransaction(this.prisma, async (transaction) => {
      const loan = await transaction.loan.findFirst({
        where: { id: loanId, userId },
        select: { id: true, status: true },
      });

      if (!loan) {
        throw new NotFoundException('Loan not found');
      }
      if (loan.status !== LoanStatus.ACTIVE) {
        throw new ConflictException('Loan has already been returned');
      }

      const returnedLoan = await transaction.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.RETURNED, returnedAt: new Date() },
        include: loanResponse,
      });
      return toLoanResponse(returnedLoan);
    });
  }

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
        throw new ConflictException(
          'An active loan already exists for this user or game copy',
        );
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
