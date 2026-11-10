import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { afterEach, vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { configureApi } from './../src/common/api-setup.js';

const testJwtSecret = 'test-only-jwt-secret-with-at-least-32-bytes';
const validPassword = 'correct-horse-battery-staple';
const categoryId = '497f6eca-6276-4993-bfeb-53cbbbba6f08';
const gameId = '89a919d8-6c8c-4faa-a6d1-1b374a284846';
const copyId = '6b2e88e9-2f21-4abe-8a83-0b550fb23884';
const userId = '78eaf4f5-f82d-462a-9b1d-7887b12450dc';
const user = {
  id: userId,
  email: 'ada@example.com',
  passwordHash: '',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'USER',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const category = {
  id: categoryId,
  name: 'Strategiczne',
  description: null,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const game = {
  _count: { copies: 1 },
  id: gameId,
  title: 'Szachy',
  description: null,
  minPlayers: 2,
  maxPlayers: 2,
  recommendedAge: 6,
  durationMinutes: 60,
  categoryId,
  category,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const gameCopy = {
  _count: { loans: 0 },
  id: copyId,
  inventoryCode: 'SZACHY-001',
  status: 'AVAILABLE',
  gameId,
  game: { id: gameId, title: 'Szachy' },
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const loan = {
  id: '47177c52-25b8-4a2d-b1ef-9d62e3ed5525',
  status: 'ACTIVE',
  borrowedAt: new Date('2026-01-03T10:00:00.000Z'),
  dueAt: new Date('2026-01-17T10:00:00.000Z'),
  returnedAt: null,
  gameCopy: {
    id: copyId,
    inventoryCode: gameCopy.inventoryCode,
    game: { id: gameId, title: game.title },
  },
};

const categoryResponse = {
  ...category,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
};

const { _count: _gameCount, ...gameFields } = game;
const gameResponse = {
  ...gameFields,
  availableCopies: 1,
  category: categoryResponse,
  createdAt: game.createdAt.toISOString(),
  updatedAt: game.updatedAt.toISOString(),
};

const { _count: _copyCount, ...copyFields } = gameCopy;
const gameCopyResponse = {
  ...copyFields,
  isAvailable: true,
  createdAt: gameCopy.createdAt.toISOString(),
  updatedAt: gameCopy.updatedAt.toISOString(),
};

function createDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createPrismaMock() {
  const prisma = {
    category: createDelegate(),
    game: createDelegate(),
    gameCopy: createDelegate(),
    loan: createDelegate(),
    user: createDelegate(),
  };
  return {
    ...prisma,
    $transaction: vi.fn(
      (
        operations:
          | readonly Promise<unknown>[]
          | ((transaction: typeof prisma) => Promise<unknown>),
      ) =>
        typeof operations === 'function'
          ? operations(prisma)
          : Promise.all(operations),
    ),
  };
}

async function createAccessToken(
  app: INestApplication,
  role: 'USER' | 'ADMIN',
) {
  return app.get(JwtService).signAsync({
    sub: userId,
    email: user.email,
    role,
  });
}

describe('BoardRent API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createPrismaMock>;
  const originalJwtSecret = process.env.AUTH_JWT_SECRET;

  beforeEach(async () => {
    process.env.AUTH_JWT_SECRET = testJwtSecret;
    prisma = createPrismaMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (originalJwtSecret === undefined) {
      delete process.env.AUTH_JWT_SECRET;
    } else {
      process.env.AUTH_JWT_SECRET = originalJwtSecret;
    }
    vi.restoreAllMocks();
  });

  it('returns the API health response', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('X-Request-Id', 'health-check-1')
      .expect(200)
      .expect('X-Request-Id', 'health-check-1')
      .expect('Hello World!');
  });

  it('registers a normalized member account with an Argon2id password hash', async () => {
    prisma.user.create.mockResolvedValue({
      ...user,
      email: 'ada@example.com',
      passwordHash: '$argon2id$stored-hash',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: ' Ada@Example.com ',
        password: validPassword,
        firstName: ' Ada ',
        lastName: ' Lovelace ',
      })
      .expect(201);

    expect(response.body).toEqual({
      id: userId,
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'USER',
      createdAt: user.createdAt.toISOString(),
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');

    const [createArgs] = prisma.user.create.mock.calls[0] ?? [];
    expect(createArgs.data).toMatchObject({
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'USER',
    });
    expect(createArgs.data.passwordHash).toMatch(/^\$argon2id\$/);
    expect(createArgs.data.passwordHash).not.toBe(validPassword);
  });

  it('rejects duplicate registration emails with 409', async () => {
    const { Prisma } = await import('@prisma/client');
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.0',
        meta: { target: ['email'] },
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'ada@example.com',
        password: validPassword,
        firstName: 'Ada',
        lastName: 'Lovelace',
      })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid registration data and client-supplied roles', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'ADMIN',
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('logs in and verifies a signed JWT access token', async () => {
    const passwordHash = await argon2.hash(validPassword, {
      type: argon2.argon2id,
    });
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ADA@example.com', password: validPassword })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: userId,
        email: user.email,
        role: 'USER',
      },
    });
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.user).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)
      .expect({ valid: true, userId });
  });

  it('returns the authenticated user profile without exposing credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const userToken = await createAccessToken(app, 'USER');

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect({
        id: userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      });

    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects invalid credentials and missing or invalid access tokens', async () => {
    const passwordHash = await argon2.hash(validPassword, {
      type: argon2.argon2id,
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({ ...user, passwordHash })
      .mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'incorrect-password' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: validPassword })
      .expect(401);
    await request(app.getHttpServer()).get('/api/auth/verify').expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('creates a 14-day loan for the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.gameCopy.findUnique.mockResolvedValue({
      id: copyId,
      status: 'AVAILABLE',
    });
    prisma.loan.count.mockResolvedValue(0);
    prisma.loan.create.mockResolvedValue(loan);
    const userToken = await createAccessToken(app, 'USER');

    const response = await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: copyId })
      .expect(201);

    expect(response.body).toEqual({
      id: loan.id,
      status: 'ACTIVE',
      borrowedAt: loan.borrowedAt.toISOString(),
      dueAt: loan.dueAt.toISOString(),
      returnedAt: null,
      gameCopy: loan.gameCopy,
    });
    const [createArgs] = prisma.loan.create.mock.calls[0] ?? [];
    expect(createArgs.data.userId).toBe(userId);
    expect(createArgs.data.gameCopyId).toBe(copyId);
    expect(
      createArgs.data.dueAt.getTime() - createArgs.data.borrowedAt.getTime(),
    ).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('requires authentication and validates the game-copy ID for borrowing', async () => {
    await request(app.getHttpServer())
      .post('/api/loans')
      .send({ gameCopyId: copyId })
      .expect(401);

    prisma.user.findUnique.mockResolvedValue(user);
    const userToken = await createAccessToken(app, 'USER');
    await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: 'not-a-uuid' })
      .expect(400);

    expect(prisma.loan.create).not.toHaveBeenCalled();
  });

  it('rejects a user who has an overdue loan', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.loan.findFirst.mockResolvedValueOnce({ id: loan.id });
    const userToken = await createAccessToken(app, 'USER');

    await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: copyId })
      .expect(409);

    expect(prisma.loan.count).not.toHaveBeenCalled();
    expect(prisma.loan.create).not.toHaveBeenCalled();
  });

  it('enforces the one-active-loan limit', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.loan.count.mockResolvedValue(1);
    const userToken = await createAccessToken(app, 'USER');

    await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: copyId })
      .expect(409);

    expect(prisma.gameCopy.findUnique).not.toHaveBeenCalled();
    expect(prisma.loan.create).not.toHaveBeenCalled();
  });

  it('rejects missing, unavailable, or already borrowed copies', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.loan.count.mockResolvedValue(0);
    const userToken = await createAccessToken(app, 'USER');

    await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: copyId })
      .expect(404);

    prisma.gameCopy.findUnique.mockResolvedValue({
      id: copyId,
      status: 'MAINTENANCE',
    });
    await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: copyId })
      .expect(409);

    prisma.gameCopy.findUnique.mockResolvedValue({
      id: copyId,
      status: 'AVAILABLE',
    });
    prisma.loan.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: loan.id });
    await request(app.getHttpServer())
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ gameCopyId: copyId })
      .expect(409);

    expect(prisma.loan.create).not.toHaveBeenCalled();
  });

  it('requires an ADMIN token for every catalog mutation', async () => {
    const writes = [
      () => request(app.getHttpServer()).post('/api/categories').send({}),
      () =>
        request(app.getHttpServer())
          .patch(`/api/categories/${categoryId}`)
          .send({}),
      () =>
        request(app.getHttpServer()).delete(`/api/categories/${categoryId}`),
      () => request(app.getHttpServer()).post('/api/games').send({}),
      () => request(app.getHttpServer()).patch(`/api/games/${gameId}`).send({}),
      () => request(app.getHttpServer()).delete(`/api/games/${gameId}`),
      () => request(app.getHttpServer()).post('/api/game-copies').send({}),
      () =>
        request(app.getHttpServer())
          .patch(`/api/game-copies/${copyId}`)
          .send({}),
      () => request(app.getHttpServer()).delete(`/api/game-copies/${copyId}`),
    ];

    for (const write of writes) {
      await write().expect(401);
    }

    prisma.user.findUnique.mockResolvedValue(user);
    const userToken = await createAccessToken(app, 'USER');
    for (const write of [
      () => request(app.getHttpServer()).post('/api/categories').send({}),
      () => request(app.getHttpServer()).post('/api/games').send({}),
      () => request(app.getHttpServer()).post('/api/game-copies').send({}),
    ]) {
      await write().set('Authorization', `Bearer ${userToken}`).expect(403);
    }
  });

  it('rejects an ADMIN token when the account role has since changed', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const adminToken = await createAccessToken(app, 'ADMIN');

    await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Strategiczne' })
      .expect(401);

    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('supports category CRUD', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    const adminToken = await createAccessToken(app, 'ADMIN');
    prisma.category.findMany.mockResolvedValue([category]);
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.category.create.mockResolvedValue(category);
    prisma.category.update.mockResolvedValue(category);
    prisma.category.delete.mockResolvedValue(category);

    await request(app.getHttpServer())
      .get('/api/categories')
      .expect(200)
      .expect([categoryResponse]);
    await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '  Strategiczne  ' })
      .expect(201)
      .expect(categoryResponse);
    await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(200)
      .expect(categoryResponse);
    await request(app.getHttpServer())
      .patch(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Gry strategiczne' })
      .expect(200)
      .expect(categoryResponse);
    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Strategiczne' },
    });
  });

  it('rejects invalid category input and unknown fields', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    const adminToken = await createAccessToken(app, 'ADMIN');
    const response = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x', id: categoryId })
      .expect(400)
      .expect('X-Request-Id', /.+/);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    });
    expect(response.body.error.requestId).toBeTruthy();
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('returns a consistent 404 error body for missing resources', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Category not found',
    });
    expect(response.body.error.requestId).toBe(
      response.headers['x-request-id'],
    );
  });

  it('uses the standard error format for an unknown route', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/unknown-route')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.requestId).toBe(
      response.headers['x-request-id'],
    );
  });

  it('does not expose unexpected error details to clients', async () => {
    const errorLog = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    prisma.category.findUnique.mockRejectedValue(
      new Error('database connection secret'),
    );

    const response = await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(500);

    expect(response.body.error).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });

    expect(JSON.stringify(response.body)).not.toContain(
      'database connection secret',
    );
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/categories/'),
      expect.stringContaining('database connection secret'),
    );
  });

  it('returns malformed JSON in the standard error envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Content-Type', 'application/json')
      .send('{"name":')
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.any(String),
    });
    expect(response.body.error.requestId).toBe(
      response.headers['x-request-id'],
    );
  });

  it('publishes the OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body.info.title).toBe('BoardRent API');
    const gamesPath = Object.keys(response.body.paths).find((path) =>
      path.endsWith('/games'),
    );
    expect(gamesPath).toBeDefined();
    if (!gamesPath) {
      throw new Error('OpenAPI document is missing the games path');
    }
    const listGamesOperation = response.body.paths[gamesPath].get;
    expect(
      listGamesOperation.parameters.map(({ name }: { name: string }) => name),
    ).toEqual(expect.arrayContaining(['q', 'categoryId', 'page', 'limit']));
    expect(listGamesOperation.responses['500']).toBeDefined();
    expect(response.body.servers).toContainEqual({ url: '/' });
    const documentedUrl = new URL(
      `${response.body.servers[0].url.replace(/\/$/, '')}${gamesPath}`,
      'http://localhost',
    );
    expect(documentedUrl.pathname).toBe('/api/games');
    await request(app.getHttpServer()).get(documentedUrl.pathname).expect(200);

    const verifyPath = Object.keys(response.body.paths).find((path) =>
      path.endsWith('/auth/verify'),
    );
    if (!verifyPath) {
      throw new Error(
        'OpenAPI document is missing the token verification path',
      );
    }
    expect(response.body.paths[verifyPath].get.security).toContainEqual({
      'access-token': [],
    });
    const profilePath = Object.keys(response.body.paths).find((path) =>
      path.endsWith('/auth/me'),
    );
    if (!profilePath) {
      throw new Error('OpenAPI document is missing the current profile path');
    }
    expect(response.body.paths[profilePath].get.security).toContainEqual({
      'access-token': [],
    });
    const categoriesPath = Object.keys(response.body.paths).find((path) =>
      path.endsWith('/categories'),
    );
    if (!categoriesPath) {
      throw new Error('OpenAPI document is missing the categories path');
    }
    expect(response.body.paths[categoriesPath].post.security).toContainEqual({
      'access-token': [],
    });
    expect(response.body.paths[categoriesPath].get.security).toBeUndefined();
    const loansPath = Object.keys(response.body.paths).find((path) =>
      path.endsWith('/loans'),
    );
    if (!loansPath) {
      throw new Error('OpenAPI document is missing the loans path');
    }
    expect(response.body.paths[loansPath].post.security).toContainEqual({
      'access-token': [],
    });
    expect(response.body.paths[loansPath].post.responses['409']).toBeDefined();
  });

  it('supports game CRUD with its category relation', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    const adminToken = await createAccessToken(app, 'ADMIN');
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.game.findMany.mockResolvedValue([game]);
    prisma.game.count.mockResolvedValue(1);
    prisma.game.findUnique.mockResolvedValue(game);
    prisma.game.create.mockResolvedValue(game);
    prisma.game.update.mockResolvedValue(game);
    prisma.game.delete.mockResolvedValue(game);

    const createGameDto = {
      title: 'Szachy',
      minPlayers: 2,
      maxPlayers: 2,
      recommendedAge: 6,
      durationMinutes: 60,
      categoryId,
    };

    await request(app.getHttpServer())
      .get('/api/games')
      .expect(200)
      .expect({
        data: [gameResponse],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    await request(app.getHttpServer())
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createGameDto)
      .expect(201)
      .expect(gameResponse);
    await request(app.getHttpServer())
      .get(`/api/games/${gameId}`)
      .expect(200)
      .expect(gameResponse);
    await request(app.getHttpServer())
      .patch(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Szachy klasyczne' })
      .expect(200)
      .expect(gameResponse);
    await request(app.getHttpServer())
      .delete(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('searches, filters and paginates games', async () => {
    prisma.game.findMany.mockResolvedValue([game]);
    prisma.game.count.mockResolvedValue(1);

    const response = await request(app.getHttpServer())
      .get(`/api/games?q=szachy&categoryId=${categoryId}&page=2&limit=5`)
      .expect(200);

    expect(response.body).toEqual({
      data: [gameResponse],
      pagination: { page: 2, limit: 5, total: 1, totalPages: 1 },
    });
    expect(prisma.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId,
          OR: [
            { title: { contains: 'szachy', mode: 'insensitive' } },
            { description: { contains: 'szachy', mode: 'insensitive' } },
          ],
        },
        skip: 5,
        take: 5,
      }),
    );
  });

  it('rejects invalid pagination and category filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/games?page=0&limit=1000&categoryId=invalid')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toHaveLength(3);
    expect(prisma.game.findMany).not.toHaveBeenCalled();
  });

  it('rejects a game with an invalid player range', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    const adminToken = await createAccessToken(app, 'ADMIN');
    prisma.category.findUnique.mockResolvedValue(category);

    await request(app.getHttpServer())
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Nieprawidłowa gra',
        minPlayers: 4,
        maxPlayers: 2,
        recommendedAge: 6,
        durationMinutes: 60,
        categoryId,
      })
      .expect(400);

    expect(prisma.game.create).not.toHaveBeenCalled();
  });

  it('supports game-copy CRUD', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    const adminToken = await createAccessToken(app, 'ADMIN');
    prisma.game.findUnique.mockResolvedValue({ id: gameId });
    prisma.gameCopy.findMany.mockResolvedValue([gameCopy]);
    prisma.gameCopy.findUnique.mockResolvedValue(gameCopy);
    prisma.gameCopy.create.mockResolvedValue(gameCopy);
    prisma.gameCopy.update.mockResolvedValue(gameCopy);
    prisma.gameCopy.delete.mockResolvedValue(gameCopy);

    await request(app.getHttpServer())
      .get('/api/game-copies')
      .expect(200)
      .expect([gameCopyResponse]);
    await request(app.getHttpServer())
      .post('/api/game-copies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ inventoryCode: 'SZACHY-001', gameId })
      .expect(201)
      .expect(gameCopyResponse);
    await request(app.getHttpServer())
      .get(`/api/game-copies/${copyId}`)
      .expect(200)
      .expect(gameCopyResponse);
    await request(app.getHttpServer())
      .patch(`/api/game-copies/${copyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'MAINTENANCE' })
      .expect(200)
      .expect(gameCopyResponse);
    await request(app.getHttpServer())
      .delete(`/api/game-copies/${copyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('reports borrowed and maintenance copies as unavailable', async () => {
    prisma.gameCopy.findUnique.mockResolvedValue({
      ...gameCopy,
      _count: { loans: 1 },
    });
    const borrowed = await request(app.getHttpServer())
      .get(`/api/game-copies/${copyId}`)
      .expect(200);
    expect(borrowed.body).toMatchObject({
      status: 'AVAILABLE',
      isAvailable: false,
    });
    expect(borrowed.body).not.toHaveProperty('_count');
    prisma.gameCopy.findUnique.mockResolvedValue({
      ...gameCopy,
      status: 'MAINTENANCE',
    });
    const maintenance = await request(app.getHttpServer())
      .get(`/api/game-copies/${copyId}`)
      .expect(200);
    expect(maintenance.body.isAvailable).toBe(false);
  });

  it('prevents an administrator from reassigning a copy with loan history', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    prisma.gameCopy.findUnique.mockResolvedValue({
      ...gameCopy,
      _count: { loans: 1 },
    });
    const token = await createAccessToken(app, 'ADMIN');
    await request(app.getHttpServer())
      .patch(`/api/game-copies/${copyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: '080f8579-82bd-48e0-8ad7-b616150f3822' })
      .expect(409);
    expect(prisma.gameCopy.update).not.toHaveBeenCalled();
  });

  it('allows reassigning a copy without history', async () => {
    const otherGameId = '080f8579-82bd-48e0-8ad7-b616150f3822';
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    prisma.gameCopy.findUnique.mockResolvedValue(gameCopy);
    prisma.game.findUnique.mockResolvedValue({ id: otherGameId });
    prisma.gameCopy.update.mockResolvedValue({
      ...gameCopy,
      gameId: otherGameId,
    });
    const token = await createAccessToken(app, 'ADMIN');
    const response = await request(app.getHttpServer())
      .patch(`/api/game-copies/${copyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: otherGameId })
      .expect(200);
    expect(response.body.gameId).toBe(otherGameId);
  });

  it('allows other edits and the unchanged game on a copy with history', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    prisma.gameCopy.findUnique.mockResolvedValue({
      ...gameCopy,
      _count: { loans: 1 },
    });
    prisma.gameCopy.update.mockResolvedValue({
      ...gameCopy,
      status: 'MAINTENANCE',
    });
    const token = await createAccessToken(app, 'ADMIN');
    const response = await request(app.getHttpServer())
      .patch(`/api/game-copies/${copyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId, status: 'MAINTENANCE' })
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'MAINTENANCE',
      isAvailable: false,
    });
  });
});
