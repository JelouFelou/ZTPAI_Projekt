import { PrismaService } from '../prisma/prisma.service.js';
import { LoansService } from './loans.service.js';
import {
  AdminListLoansQueryDto,
  ListLoansQueryDto,
} from './dto/list-loans-query.dto.js';

function setup() {
  const record = {
    id: 'loan',
    status: 'ACTIVE',
    borrowedAt: new Date('2026-01-01T12:00:00Z'),
    dueAt: new Date('2026-01-15T12:00:00Z'),
    returnedAt: null,
    user: {
      id: 'owner',
      email: 'owner@example.com',
      firstName: 'Ada',
      lastName: 'Test',
      passwordHash: 'secret-hash',
    },
    gameCopy: {
      id: 'copy',
      inventoryCode: 'COPY-1',
      game: { id: 'game', title: 'Chess' },
    },
  };
  const prisma = {
    loan: {
      findMany: vi.fn().mockResolvedValue([record]),
      count: vi.fn().mockResolvedValue(1),
    },
    $transaction: vi
      .fn()
      .mockImplementation((operations) => Promise.all(operations)),
  };
  return {
    prisma,
    record,
    service: new LoansService(prisma as unknown as PrismaService),
  };
}

describe('Borrowing history', () => {
  it('scopes the personal list and count to the authenticated user', async () => {
    const { service, prisma } = setup();
    const result = await service.findMyHistory(
      'owner',
      new ListLoansQueryDto(),
    );
    expect(prisma.loan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner' } }),
    );
    expect(prisma.loan.count).toHaveBeenCalledWith({
      where: { userId: 'owner' },
    });
    expect(result.data[0]).not.toHaveProperty('user');
    expect(result.data[0].borrowedAt).toBe('2026-01-01T12:00:00.000Z');
  });

  it('returns only the selected borrower details for administrators', async () => {
    const { service } = setup();
    const result = await service.findAllHistory(new AdminListLoansQueryDto());
    expect(result.data[0].user).toEqual({
      id: 'owner',
      email: 'owner@example.com',
      firstName: 'Ada',
      lastName: 'Test',
    });
    expect(JSON.stringify(result)).not.toContain('secret-hash');
  });

  it('computes pagination metadata from the filtered count', async () => {
    const { service, prisma } = setup();
    prisma.loan.count.mockResolvedValue(5);
    const result = await service.findAllHistory({
      page: 2,
      limit: 2,
      userId: 'owner',
      status: 'RETURNED',
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
    expect(prisma.loan.count).toHaveBeenCalledWith({
      where: { userId: 'owner', status: 'RETURNED' },
    });
  });

  it('returns an empty page without losing the total count', async () => {
    const { service, prisma } = setup();
    prisma.loan.findMany.mockResolvedValue([]);
    const result = await service.findMyHistory('owner', { page: 2, limit: 1 });
    expect(result).toEqual({
      data: [],
      pagination: { page: 2, limit: 1, total: 1, totalPages: 1 },
    });
  });
});
