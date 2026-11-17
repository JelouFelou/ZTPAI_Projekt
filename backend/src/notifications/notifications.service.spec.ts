import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

function setup() {
  const prisma = {
    loan: { findMany: vi.fn().mockResolvedValue([]) },
    notification: {
      create: vi.fn().mockResolvedValue(undefined),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return {
    prisma,
    service: new NotificationsService(prisma as unknown as PrismaService),
  };
}

describe('NotificationsService', () => {
  it('persists an asynchronous notification after a loan event', async () => {
    const { prisma, service } = setup();
    await service.recordBorrowedLoan({
      loanId: 'loan',
      userId: 'user',
      gameTitle: 'Chess',
      inventoryCode: 'COPY-1',
      dueAt: '2026-01-15T12:00:00.000Z',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user',
        loanId: 'loan',
        type: NotificationType.LOAN_BORROWED,
        message:
          'Game borrowed: Chess (COPY-1). Return by 2026-01-15T12:00:00.000Z.',
      },
    });
  });

  it('records overdue reminders once per loan and skips duplicate rows', async () => {
    const { prisma, service } = setup();
    const now = new Date('2026-02-01T12:00:00.000Z');
    const dueAt = new Date('2026-01-31T12:00:00.000Z');
    prisma.loan.findMany.mockResolvedValue([
      {
        id: 'loan',
        userId: 'user',
        dueAt,
        gameCopy: {
          inventoryCode: 'COPY-1',
          game: { title: 'Chess' },
        },
      },
    ]);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });

    await expect(service.recordOverdueReminders(now)).resolves.toBe(1);

    expect(prisma.loan.findMany).toHaveBeenCalledWith({
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
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user',
          loanId: 'loan',
          type: NotificationType.LOAN_OVERDUE_REMINDER,
          message:
            'Overdue loan: Chess (COPY-1), due 2026-01-31T12:00:00.000Z.',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not insert reminders when no loans are overdue', async () => {
    const { prisma, service } = setup();

    await expect(
      service.recordOverdueReminders(new Date('2026-02-01T12:00:00.000Z')),
    ).resolves.toBe(0);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
