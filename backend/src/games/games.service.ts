import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowPrismaError } from '../common/prisma-errors.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';
import { ListGamesQueryDto } from './dto/list-games-query.dto.js';
import { toGameResponse } from './game.mapper.js';
import type { GameListResponseDto } from './dto/game-response.dto.js';

const gameResponse = { category: true } as const;

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListGamesQueryDto): Promise<GameListResponseDto> {
    const where: Prisma.GameWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [games, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        include: gameResponse,
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      data: games.map(toGameResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: gameResponse,
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return toGameResponse(game);
  }

  async create(dto: CreateGameDto) {
    this.validatePlayerRange(dto.minPlayers, dto.maxPlayers);
    await this.ensureCategoryExists(dto.categoryId);

    try {
      const game = await this.prisma.game.create({
        data: dto,
        include: gameResponse,
      });
      return toGameResponse(game);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateGameDto) {
    const currentGame = await this.prisma.game.findUnique({
      where: { id },
      select: { minPlayers: true, maxPlayers: true },
    });

    if (!currentGame) {
      throw new NotFoundException('Game not found');
    }

    const minPlayers = dto.minPlayers ?? currentGame.minPlayers;
    const maxPlayers = dto.maxPlayers ?? currentGame.maxPlayers;
    this.validatePlayerRange(minPlayers, maxPlayers);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    try {
      const game = await this.prisma.game.update({
        where: { id },
        data: dto,
        include: gameResponse,
      });
      return toGameResponse(game);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.game.delete({ where: { id } });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  private validatePlayerRange(minPlayers: number, maxPlayers: number): void {
    if (minPlayers > maxPlayers) {
      throw new BadRequestException('minPlayers must not exceed maxPlayers');
    }
  }

  private async ensureCategoryExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}
