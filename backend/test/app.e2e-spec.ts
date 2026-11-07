import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const categoryId = '497f6eca-6276-4993-bfeb-53cbbbba6f08';
const gameId = '89a919d8-6c8c-4faa-a6d1-1b374a284846';
const copyId = '6b2e88e9-2f21-4abe-8a83-0b550fb23884';

const category = {
  id: categoryId,
  name: 'Strategiczne',
  description: null,
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
};

const gameCopy = {
  id: copyId,
  inventoryCode: 'SZACHY-001',
  status: 'AVAILABLE',
  gameId,
  game: { id: gameId, title: 'Szachy' },
};

function createDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
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
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('returns the API health response', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
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
      .expect([category]);
    await request(app.getHttpServer())
      .post('/api/categories')
      .send({ name: '  Strategiczne  ' })
      .expect(201)
      .expect(category);
    await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(200)
      .expect(category);
    await request(app.getHttpServer())
      .patch(`/api/categories/${categoryId}`)
      .send({ description: 'Gry strategiczne' })
      .expect(200)
      .expect(category);
    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}`)
      .expect(204);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Strategiczne' },
    });
  });

  it('rejects invalid category input and unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/categories')
      .send({ name: 'x', id: categoryId })
      .expect(400);

    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('supports game CRUD with its category relation', async () => {
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.game.findMany.mockResolvedValue([game]);
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
      .expect([game]);
    await request(app.getHttpServer())
      .post('/api/games')
      .send(createGameDto)
      .expect(201)
      .expect(game);
    await request(app.getHttpServer())
      .get(`/api/games/${gameId}`)
      .expect(200)
      .expect(game);
    await request(app.getHttpServer())
      .patch(`/api/games/${gameId}`)
      .send({ title: 'Szachy klasyczne' })
      .expect(200)
      .expect(game);
    await request(app.getHttpServer())
      .delete(`/api/games/${gameId}`)
      .expect(204);
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
      .expect([gameCopy]);
    await request(app.getHttpServer())
      .post('/api/game-copies')
      .send({ inventoryCode: 'SZACHY-001', gameId })
      .expect(201)
      .expect(gameCopy);
    await request(app.getHttpServer())
      .get(`/api/game-copies/${copyId}`)
      .expect(200)
      .expect(gameCopy);
    await request(app.getHttpServer())
      .patch(`/api/game-copies/${copyId}`)
      .send({ status: 'MAINTENANCE' })
      .expect(200)
      .expect(gameCopy);
    await request(app.getHttpServer())
      .delete(`/api/game-copies/${copyId}`)
      .expect(204);
  });
});
