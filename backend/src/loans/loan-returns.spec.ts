import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoansService } from './loans.service.js';

function setup() {
  const activeLoan = {
    id: 'loan',
    status: 'ACTIVE',
    borrowedAt: new Date('2026-01-01T12:00:00Z'),
    dueAt: new Date('2026-01-15T12:00:00Z'),
    returnedAt: null,
    gameCopy: {
      id: 'copy',
      inventoryCode: 'COPY-1',
      game: { id: 'game', title: 'Chess' },
    },
  };
  const transaction = {
    loan: {
      findFirst: vi.fn().mockResolvedValue(activeLoan),
      update: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...activeLoan, ...data }),
        ),
    },
  };
  const prisma = {
    $transaction: vi
      .fn()
      .mockImplementation((operation) => operation(transaction)),
  };
  return {
    activeLoan,
    transaction,
    prisma,
    service: new LoansService(prisma as unknown as PrismaService),
  };
}

describe('Loan returns', () => {
  it('returns the authenticated user’s loan with a server-generated date and unchanged deadline', async () => {
    const { activeLoan, service, transaction } = setup();
    const before = Date.now();
    const result = await service.returnLoan('user', 'loan');
    expect(result).toMatchObject({
      status: 'RETURNED',
      borrowedAt: activeLoan.borrowedAt.toISOString(),
      dueAt: activeLoan.dueAt.toISOString(),
    });
    expect(new Date(result.returnedAt!).getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect(new Date(result.returnedAt!).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );
    expect(transaction.loan.findFirst).toHaveBeenCalledWith({
      where: { id: 'loan', userId: 'user' },
      select: { id: true, status: true },
    });
    expect(transaction.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'loan' },
        data: { status: 'RETURNED', returnedAt: expect.any(Date) },
      }),
    );
  });

  it('does not modify a missing or someone else’s loan', async () => {
    const { service, transaction } = setup();
    transaction.loan.findFirst.mockResolvedValue(null);
    await expect(service.returnLoan('user', 'loan')).rejects.toThrow(
      NotFoundException,
    );
    expect(transaction.loan.update).not.toHaveBeenCalled();
  });

  it('rejects an already returned loan without overwriting its return date', async () => {
    const { activeLoan, service, transaction } = setup();
    transaction.loan.findFirst.mockResolvedValue({
      ...activeLoan,
      status: 'RETURNED',
      returnedAt: new Date('2026-01-02T12:00:00Z'),
    });
    await expect(service.returnLoan('user', 'loan')).rejects.toThrow(
      ConflictException,
    );
    expect(transaction.loan.update).not.toHaveBeenCalled();
  });

  it('rechecks the status after a conflicting simultaneous return', async () => {
    const { activeLoan, service, transaction, prisma } = setup();
    transaction.loan.findFirst
      .mockResolvedValueOnce(activeLoan)
      .mockResolvedValueOnce({ ...activeLoan, status: 'RETURNED' });
    transaction.loan.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    await expect(service.returnLoan('user', 'loan')).rejects.toThrow(
      'already been returned',
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(transaction.loan.update).toHaveBeenCalledTimes(1);
  });
});
