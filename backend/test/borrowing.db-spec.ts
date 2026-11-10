import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { LoansService } from '../src/loans/loans.service.js';
import { GameCopiesService } from '../src/game-copies/game-copies.service.js';

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
  await prisma.loan.update({
    where: { id: loan.id },
    data: { status: 'RETURNED', returnedAt: new Date() },
  });
  expect(await copies.findOne(copyIds[0])).toMatchObject({ isAvailable: true });
  await expect(
    copies.update(copyIds[0], { gameId: randomUUID() }),
  ).rejects.toThrow(ConflictException);
  expect(
    await prisma.gameCopy.findUnique({ where: { id: copyIds[0] } }),
  ).toMatchObject({ gameId });
});
