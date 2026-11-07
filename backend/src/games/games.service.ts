import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowPrismaError } from '../common/prisma-errors.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';

const gameResponse = { category: true } as const;

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.game.findMany({
      include: gameResponse,
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: gameResponse,
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async create(dto: CreateGameDto) {
    this.validatePlayerRange(dto.minPlayers, dto.maxPlayers);
    await this.ensureCategoryExists(dto.categoryId);

    try {
      return await this.prisma.game.create({
        data: dto,
        include: gameResponse,
      });
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
      return await this.prisma.game.update({
        where: { id },
        data: dto,
        include: gameResponse,
      });
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
      throw new BadRequestException(
        'minPlayers must not exceed maxPlayers',
      );
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
