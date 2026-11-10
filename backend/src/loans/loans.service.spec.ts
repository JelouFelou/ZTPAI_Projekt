import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoansService } from './loans.service.js';

function setup() {
  const transaction = {
    loan: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...data,
          id: 'loan',
          status: 'ACTIVE',
          returnedAt: null,
          gameCopy: {
            id: 'copy',
            inventoryCode: 'COPY-1',
            game: { id: 'game', title: 'Chess' },
          },
        }),
      ),
    },
    gameCopy: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'copy', status: 'AVAILABLE' }),
    },
  };
  const prisma = {
    $transaction: vi
      .fn()
      .mockImplementation((operation) => operation(transaction)),
  };
  return {
    transaction,
    prisma,
    service: new LoansService(prisma as unknown as PrismaService),
  };
}

describe('LoansService borrowing rules', () => {
  it('assigns the authenticated user and a 14-day deadline', async () => {
    const { service, prisma, transaction } = setup();
    const result = await service.borrow('user', { gameCopyId: 'copy' });
    expect(transaction.loan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user', gameCopyId: 'copy' }),
      }),
    );
    expect(
      new Date(result.dueAt).getTime() - new Date(result.borrowedAt).getTime(),
    ).toBe(14 * 86400000);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('blocks overdue loans before creating a new one', async () => {
    const { service, transaction } = setup();
    transaction.loan.findFirst.mockResolvedValueOnce({ id: 'overdue' });
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow('overdue');
    expect(transaction.loan.create).not.toHaveBeenCalled();
  });

  it('blocks the active-loan limit', async () => {
    const { service, transaction } = setup();
    transaction.loan.count.mockResolvedValue(1);
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow(ConflictException);
    expect(transaction.loan.create).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent copy', async () => {
    const { service, transaction } = setup();
    transaction.gameCopy.findUnique.mockResolvedValue(null);
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow(NotFoundException);
  });

  it.each(['MAINTENANCE', 'RETIRED'])(
    'rejects a copy in %s',
    async (status) => {
      const { service, transaction } = setup();
      transaction.gameCopy.findUnique.mockResolvedValue({ id: 'copy', status });
      await expect(
        service.borrow('user', { gameCopyId: 'copy' }),
      ).rejects.toThrow(ConflictException);
      expect(transaction.loan.create).not.toHaveBeenCalled();
    },
  );

  it('rejects a copy with an active loan', async () => {
    const { service, transaction } = setup();
    transaction.loan.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'active' });
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow('already borrowed');
  });

  it('rechecks business rules after a serialization conflict', async () => {
    const { service, prisma, transaction } = setup();
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    transaction.loan.count.mockResolvedValue(1);
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow('at most');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(transaction.loan.create).not.toHaveBeenCalled();
  });

  it('returns a conflict after bounded retries', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('maps the active-copy unique constraint to a conflict', async () => {
    const { service, transaction } = setup();
    transaction.loan.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rechecks rules if acquiring a transaction timed out before it started', async () => {
    const { service, prisma, transaction } = setup();
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        'Unable to start a transaction',
        { code: 'P2028', clientVersion: 'test' },
      ),
    );
    transaction.loan.count.mockResolvedValue(1);
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow('at most');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(transaction.loan.create).not.toHaveBeenCalled();
  });

  it('returns service unavailable when no transaction can be acquired after three attempts', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unable to start a transaction',
        { code: 'P2028', clientVersion: 'test' },
      ),
    );
    await expect(
      service.borrow('user', { gameCopyId: 'copy' }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry other P2028 errors from an already started transaction', async () => {
    const { service, prisma, transaction } = setup();
    const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction already closed',
      { code: 'P2028', clientVersion: 'test' },
    );
    transaction.loan.count.mockRejectedValue(error);
    await expect(service.borrow('user', { gameCopyId: 'copy' })).rejects.toBe(
      error,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
