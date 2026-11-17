import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

function setup() {
  const prisma = {
    loan: { findMany: vi.fn().mockResolvedValue([]) },
    notification: {
      create: vi.fn().mockResolvedValue(undefined),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi
      .fn()
      .mockImplementation((operations) => Promise.all(operations)),
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
          'Wypożyczono grę „Chess” (COPY-1). Termin zwrotu: 15 sty 2026, 13:00.',
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
            'Wypożyczenie gry „Chess” (COPY-1) jest przeterminowane. Termin zwrotu: 31 sty 2026, 13:00. Prosimy o zwrot egzemplarza.',
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

  it('scopes the list and count to the owner and paginates newest first', async () => {
    const { service, prisma } = setup();
    prisma.notification.count.mockResolvedValue(25);
    const result = await service.findMine('owner', { page: 2, limit: 10 });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'owner', loan: { userId: 'owner' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 10,
        take: 10,
      }),
    );
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'owner', loan: { userId: 'owner' } },
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: 'RepeatableRead',
    });
  });

  it('returns an empty notification page with zero totalPages', async () => {
    const { service } = setup();
    await expect(
      service.findMine('owner', { page: 1, limit: 20 }),
    ).resolves.toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });
});
