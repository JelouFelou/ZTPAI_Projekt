import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { configureApi } from './../src/common/api-setup.js';

const categoryId = '497f6eca-6276-4993-bfeb-53cbbbba6f08';
const gameId = '89a919d8-6c8c-4faa-a6d1-1b374a284846';
const copyId = '6b2e88e9-2f21-4abe-8a83-0b550fb23884';

const category = {
  id: categoryId,
  name: 'Strategiczne',
  description: null,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const game = {
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
  id: copyId,
  inventoryCode: 'SZACHY-001',
  status: 'AVAILABLE',
  gameId,
  game: { id: gameId, title: 'Szachy' },
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const categoryResponse = {
  ...category,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
};

const gameResponse = {
  ...game,
  category: categoryResponse,
  createdAt: game.createdAt.toISOString(),
  updatedAt: game.updatedAt.toISOString(),
};

const gameCopyResponse = {
  ...gameCopy,
  createdAt: gameCopy.createdAt.toISOString(),
  updatedAt: gameCopy.updatedAt.toISOString(),
};

function createDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createPrismaMock() {
  return {
    category: createDelegate(),
    game: createDelegate(),
    gameCopy: createDelegate(),
    $transaction: vi.fn((operations: readonly Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
}

describe('BoardRent API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
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

  it('supports category CRUD', async () => {
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
      .send({ name: '  Strategiczne  ' })
      .expect(201)
      .expect(categoryResponse);
    await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(200)
      .expect(categoryResponse);
    await request(app.getHttpServer())
      .patch(`/api/categories/${categoryId}`)
      .send({ description: 'Gry strategiczne' })
      .expect(200)
      .expect(categoryResponse);
    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}`)
      .expect(204);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Strategiczne' },
    });
  });

  it('rejects invalid category input and unknown fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/categories')
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
    expect(response.body.servers).toContainEqual({ url: '/api' });
  });

  it('supports game CRUD with its category relation', async () => {
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
      .send(createGameDto)
      .expect(201)
      .expect(gameResponse);
    await request(app.getHttpServer())
      .get(`/api/games/${gameId}`)
      .expect(200)
      .expect(gameResponse);
    await request(app.getHttpServer())
      .patch(`/api/games/${gameId}`)
      .send({ title: 'Szachy klasyczne' })
      .expect(200)
      .expect(gameResponse);
    await request(app.getHttpServer())
      .delete(`/api/games/${gameId}`)
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
    prisma.category.findUnique.mockResolvedValue(category);

    await request(app.getHttpServer())
      .post('/api/games')
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
      .send({ inventoryCode: 'SZACHY-001', gameId })
      .expect(201)
      .expect(gameCopyResponse);
    await request(app.getHttpServer())
      .get(`/api/game-copies/${copyId}`)
      .expect(200)
      .expect(gameCopyResponse);
    await request(app.getHttpServer())
      .patch(`/api/game-copies/${copyId}`)
      .send({ status: 'MAINTENANCE' })
      .expect(200)
      .expect(gameCopyResponse);
    await request(app.getHttpServer())
      .delete(`/api/game-copies/${copyId}`)
      .expect(204);
  });
});
