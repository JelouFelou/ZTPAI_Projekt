import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { LoansService } from '../src/loans/loans.service.js';
import { GameCopiesService } from '../src/game-copies/game-copies.service.js';
import { GamesService } from '../src/games/games.service.js';

// Explicit opt-in: never fall back to the application's DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set TEST_DATABASE_URL to a separate migrated PostgreSQL test database',
  );

const prisma = new PrismaService({ datasourceUrl: url });
const otherPrisma = new PrismaService({ datasourceUrl: url });
const loans = new LoansService(prisma);
const otherLoans = new LoansService(otherPrisma);
const copies = new GameCopiesService(prisma);
const games = new GamesService(prisma);
let userIds: string[] = [];
let copyIds: string[] = [];
let categoryId: string;
let gameId: string;

beforeAll(async () => {
  await Promise.all([prisma.$connect(), otherPrisma.$connect()]);
});
afterAll(async () => {
  await Promise.all([prisma.$disconnect(), otherPrisma.$disconnect()]);
});

beforeEach(async () => {
  userIds = [];
  copyIds = [];
  categoryId = '';
  gameId = '';
  const suffix = randomUUID();
  categoryId = (await prisma.category.create({ data: { name: suffix } })).id;
  gameId = (
    await prisma.game.create({
      data: {
        categoryId,
        title: suffix,
        minPlayers: 1,
        maxPlayers: 4,
        recommendedAge: 6,
        durationMinutes: 30,
      },
    })
  ).id;
  for (let index = 0; index < 2; index++) {
    userIds.push(
      (
        await prisma.user.create({
          data: {
            email: `${index}-${suffix}@example.com`,
            passwordHash: 'unused',
            firstName: 'Test',
            lastName: 'User',
          },
        })
      ).id,
    );
    copyIds.push(
      (
        await prisma.gameCopy.create({
          data: { gameId, inventoryCode: `${index}-${suffix}` },
        })
      ).id,
    );
  }
});

afterEach(async () => {
  await prisma.loan.deleteMany({ where: { gameCopyId: { in: copyIds } } });
  await prisma.gameCopy.deleteMany({ where: { id: { in: copyIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (gameId) await prisma.game.deleteMany({ where: { id: gameId } });
  if (categoryId)
    await prisma.category.deleteMany({ where: { id: categoryId } });
});

it('persists borrowing and exposes actual availability', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  expect(
    await prisma.loan.findUnique({ where: { id: loan.id } }),
  ).toMatchObject({ userId: userIds[0], status: 'ACTIVE' });
  expect(await copies.findOne(copyIds[0])).toMatchObject({
    status: 'AVAILABLE',
    isAvailable: false,
  });
  expect(await copies.findOne(copyIds[1])).toMatchObject({ isAvailable: true });
});

it('allows only one of two users to borrow the same copy concurrently', async () => {
  const results = await Promise.allSettled(
    userIds.map((id, index) =>
      (index === 0 ? loans : otherLoans).borrow(id, { gameCopyId: copyIds[0] }),
    ),
  );
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1);
  const rejected = results.find((result) => result.status === 'rejected');
  expect(rejected?.reason).toBeInstanceOf(ConflictException);
  expect(
    await prisma.loan.count({
      where: { gameCopyId: copyIds[0], status: 'ACTIVE' },
    }),
  ).toBe(1);
});

it('enforces the user limit across concurrent requests for different copies', async () => {
  const results = await Promise.allSettled(
    copyIds.map((id, index) =>
      (index === 0 ? loans : otherLoans).borrow(userIds[0], { gameCopyId: id }),
    ),
  );
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(
    results.find((result) => result.status === 'rejected')?.reason,
  ).toBeInstanceOf(ConflictException);
  expect(
    await prisma.loan.count({
      where: { userId: userIds[0], status: 'ACTIVE' },
    }),
  ).toBe(1);
});

it('enforces the partial unique index even outside the borrowing service', async () => {
  await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await expect(
    prisma.loan.create({
      data: {
        userId: userIds[1],
        gameCopyId: copyIds[0],
        dueAt: new Date(Date.now() + 86400000),
      },
    }),
  ).rejects.toMatchObject({ code: 'P2002' });
});

it('enforces the user limit in PostgreSQL even outside the borrowing service', async () => {
  await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await expect(
    prisma.loan.create({
      data: {
        userId: userIds[0],
        gameCopyId: copyIds[1],
        dueAt: new Date(Date.now() + 86400000),
      },
    }),
  ).rejects.toMatchObject({ code: 'P2002' });
  expect(
    await prisma.loan.count({
      where: { userId: userIds[0], status: 'ACTIVE' },
    }),
  ).toBe(1);
});

it('handles competing requests sharing a single Prisma connection pool', async () => {
  const results = await Promise.allSettled(
    copyIds.map((id) => loans.borrow(userIds[0], { gameCopyId: id })),
  );
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(
    results.find((result) => result.status === 'rejected')?.reason,
  ).toBeInstanceOf(ConflictException);
  expect(
    await prisma.loan.count({
      where: { userId: userIds[0], status: 'ACTIVE' },
    }),
  ).toBe(1);
});

it('protects loan history even after a return', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await loans.returnLoan(userIds[0], loan.id);
  expect(await copies.findOne(copyIds[0])).toMatchObject({ isAvailable: true });
  await expect(
    copies.update(copyIds[0], { gameId: randomUUID() }),
  ).rejects.toThrow(ConflictException);
  expect(
    await prisma.gameCopy.findUnique({ where: { id: copyIds[0] } }),
  ).toMatchObject({ gameId });
});

it('persists a return, restores catalog availability and allows borrowing again', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  expect(await games.findOne(gameId)).toMatchObject({ availableCopies: 1 });
  const returned = await loans.returnLoan(userIds[0], loan.id);
  expect(returned).toMatchObject({
    status: 'RETURNED',
    borrowedAt: loan.borrowedAt,
    dueAt: loan.dueAt,
  });
  expect(
    await prisma.loan.findUnique({ where: { id: loan.id } }),
  ).toMatchObject({
    status: 'RETURNED',
    returnedAt: new Date(returned.returnedAt!),
  });
  expect(await copies.findOne(copyIds[0])).toMatchObject({ isAvailable: true });
  expect(await games.findOne(gameId)).toMatchObject({ availableCopies: 2 });
  const nextLoan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  expect(nextLoan.id).not.toBe(loan.id);
  expect(nextLoan.status).toBe('ACTIVE');
});

it('prevents another user from returning a loan', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await expect(otherLoans.returnLoan(userIds[1], loan.id)).rejects.toThrow(
    NotFoundException,
  );
  expect(
    await prisma.loan.findUnique({ where: { id: loan.id } }),
  ).toMatchObject({ status: 'ACTIVE', returnedAt: null });
});

it('rejects a repeated return and preserves the original return date', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  const returned = await loans.returnLoan(userIds[0], loan.id);
  await expect(loans.returnLoan(userIds[0], loan.id)).rejects.toThrow(
    ConflictException,
  );
  expect(
    await prisma.loan.findUnique({ where: { id: loan.id } }),
  ).toMatchObject({ returnedAt: new Date(returned.returnedAt!) });
});

it('accepts only one simultaneous return across independent connections', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  const results = await Promise.allSettled([
    loans.returnLoan(userIds[0], loan.id),
    otherLoans.returnLoan(userIds[0], loan.id),
  ]);
  const successes = results.filter((result) => result.status === 'fulfilled');
  expect(successes).toHaveLength(1);
  expect(
    results.find((result) => result.status === 'rejected')?.reason,
  ).toBeInstanceOf(ConflictException);
  expect(
    await prisma.loan.findUnique({ where: { id: loan.id } }),
  ).toMatchObject({
    status: 'RETURNED',
    returnedAt: new Date(successes[0].value.returnedAt!),
  });
});

it.each(['MAINTENANCE', 'RETIRED'] as const)(
  'keeps a returned %s copy unavailable',
  async (status) => {
    const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
    await prisma.gameCopy.update({
      where: { id: copyIds[0] },
      data: { status },
    });
    await loans.returnLoan(userIds[0], loan.id);
    expect(await copies.findOne(copyIds[0])).toMatchObject({
      status,
      isAvailable: false,
    });
    expect(await games.findOne(gameId)).toMatchObject({ availableCopies: 1 });
    await expect(
      otherLoans.borrow(userIds[1], { gameCopyId: copyIds[0] }),
    ).rejects.toThrow(ConflictException);
  },
);

it('allows returning an overdue loan and removes the borrowing block', async () => {
  const loan = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await prisma.loan.update({
    where: { id: loan.id },
    data: {
      borrowedAt: new Date(Date.now() - 15 * 86400000),
      dueAt: new Date(Date.now() - 86400000),
    },
  });
  await expect(
    loans.borrow(userIds[0], { gameCopyId: copyIds[1] }),
  ).rejects.toThrow('overdue');
  await loans.returnLoan(userIds[0], loan.id);
  expect(
    await loans.borrow(userIds[0], { gameCopyId: copyIds[1] }),
  ).toMatchObject({ status: 'ACTIVE' });
});

it('scopes and paginates personal history with deterministic ordering and status filtering', async () => {
  const first = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await loans.returnLoan(userIds[0], first.id);
  const second = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await loans.returnLoan(userIds[0], second.id);
  const active = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await otherLoans.borrow(userIds[1], { gameCopyId: copyIds[1] });
  await prisma.loan.updateMany({
    where: { id: { in: [first.id, second.id] } },
    data: { borrowedAt: new Date('2026-01-01T12:00:00Z') },
  });
  const expectedIds = [active.id, ...[first.id, second.id].sort().reverse()];
  const page1 = await loans.findMyHistory(userIds[0], { page: 1, limit: 2 });
  const page2 = await loans.findMyHistory(userIds[0], { page: 2, limit: 2 });
  expect([...page1.data, ...page2.data].map((entry) => entry.id)).toEqual(
    expectedIds,
  );
  expect(page1.pagination).toEqual({
    page: 1,
    limit: 2,
    total: 3,
    totalPages: 2,
  });
  expect(page1.data[0]).not.toHaveProperty('user');
  const returned = await loans.findMyHistory(userIds[0], {
    page: 1,
    limit: 20,
    status: 'RETURNED',
  });
  expect(returned.data.map((entry) => entry.id)).toEqual(expectedIds.slice(1));
  expect(returned.pagination.total).toBe(2);
  const current = await loans.findMyHistory(userIds[0], {
    page: 1,
    limit: 20,
    status: 'ACTIVE',
  });
  expect(current.data.map((entry) => entry.id)).toEqual([active.id]);
});

it('lists all borrowers for administrators and supports combined filters without credentials', async () => {
  const first = await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  await loans.returnLoan(userIds[0], first.id);
  const second = await otherLoans.borrow(userIds[1], {
    gameCopyId: copyIds[1],
  });
  const all = await loans.findAllHistory({ page: 1, limit: 20 });
  expect(all.pagination.total).toBe(2);
  expect(all.data.map((entry) => entry.id).sort()).toEqual(
    [first.id, second.id].sort(),
  );
  expect(
    all.data.every(
      (entry) =>
        Object.keys(entry.user).sort().join(',') ===
        'email,firstName,id,lastName',
    ),
  ).toBe(true);
  const filtered = await loans.findAllHistory({
    page: 1,
    limit: 20,
    userId: userIds[0],
    status: 'RETURNED',
  });
  expect(filtered.data.map((entry) => entry.id)).toEqual([first.id]);
  expect(filtered.data[0].user).toMatchObject({
    id: userIds[0],
    firstName: 'Test',
  });
  expect(filtered.pagination.total).toBe(1);
});

it('returns empty history and pages beyond the last result with correct totals', async () => {
  expect(await loans.findMyHistory(userIds[0], { page: 1, limit: 20 })).toEqual(
    { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  );
  await loans.borrow(userIds[0], { gameCopyId: copyIds[0] });
  expect(await loans.findMyHistory(userIds[0], { page: 2, limit: 1 })).toEqual({
    data: [],
    pagination: { page: 2, limit: 1, total: 1, totalPages: 1 },
  });
  expect(
    (await loans.findAllHistory({ page: 1, limit: 20, userId: userIds[1] }))
      .pagination.total,
  ).toBe(0);
});
