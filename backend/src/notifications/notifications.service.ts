import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { LoanBorrowedEvent } from './loan-events.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import type { NotificationListResponseDto } from './dto/notification-response.dto.js';
import { notificationMessage } from './notification-message.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMine(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    const where = { userId, loan: { userId } };
    const [notifications, total] = await this.prisma.$transaction(
      [
        this.prisma.notification.findMany({
          where,
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
            loan: {
              select: {
                dueAt: true,
                gameCopy: {
                  select: {
                    inventoryCode: true,
                    game: { select: { title: true } },
                  },
                },
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.notification.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: notifications.map((item) => ({
        id: item.id,
        type: item.type,
        // Older events were saved in English. Localize them without rewriting history.
        message:
          item.message.startsWith('Game borrowed: ') ||
          item.message.startsWith('Overdue loan: ')
            ? notificationMessage(
                item.type,
                item.loan.gameCopy.game.title,
                item.loan.gameCopy.inventoryCode,
                item.loan.dueAt,
              )
            : item.message,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async recordBorrowedLoan(event: LoanBorrowedEvent): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: event.userId,
        loanId: event.loanId,
        type: NotificationType.LOAN_BORROWED,
        message: notificationMessage(
          NotificationType.LOAN_BORROWED,
          event.gameTitle,
          event.inventoryCode,
          event.dueAt,
        ),
      },
    });
  }

  async recordOverdueReminders(now = new Date()): Promise<number> {
    const overdueLoans = await this.prisma.loan.findMany({
      where: { status: 'ACTIVE', dueAt: { lt: now } },
      select: {
        id: true,
        userId: true,
        dueAt: true,
        gameCopy: {
          select: {
            inventoryCode: true,
            game: { select: { title: true } },
          },
        },
      },
    });

    if (overdueLoans.length === 0) {
      return 0;
    }

    const result = await this.prisma.notification.createMany({
      data: overdueLoans.map((loan) => ({
        userId: loan.userId,
        loanId: loan.id,
        type: NotificationType.LOAN_OVERDUE_REMINDER,
        message: notificationMessage(
          NotificationType.LOAN_OVERDUE_REMINDER,
          loan.gameCopy.game.title,
          loan.gameCopy.inventoryCode,
          loan.dueAt,
        ),
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      this.logger.log(`Recorded ${result.count} overdue loan reminder(s)`);
    }
    return result.count;
  }
}
