import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { LoanBorrowedEvent } from './loan-events.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordBorrowedLoan(event: LoanBorrowedEvent): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: event.userId,
        loanId: event.loanId,
        type: NotificationType.LOAN_BORROWED,
        message: `Game borrowed: ${event.gameTitle} (${event.inventoryCode}). Return by ${event.dueAt}.`,
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
        message: `Overdue loan: ${loan.gameCopy.game.title} (${loan.gameCopy.inventoryCode}), due ${loan.dueAt.toISOString()}.`,
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      this.logger.log(`Recorded ${result.count} overdue loan reminder(s)`);
    }
    return result.count;
  }
}
