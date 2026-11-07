import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowPrismaError } from '../common/prisma-errors.js';
import { CreateGameCopyDto } from './dto/create-game-copy.dto.js';
import { UpdateGameCopyDto } from './dto/update-game-copy.dto.js';

const copyResponse = {
  game: { select: { id: true, title: true } },
} as const;

@Injectable()
export class GameCopiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.gameCopy.findMany({
      include: copyResponse,
      orderBy: { inventoryCode: 'asc' },
    });
  }

  async findOne(id: string) {
    const copy = await this.prisma.gameCopy.findUnique({
      where: { id },
      include: copyResponse,
    });

    if (!copy) {
      throw new NotFoundException('Game copy not found');
    }

    return copy;
  }

  async create(dto: CreateGameCopyDto) {
    await this.ensureGameExists(dto.gameId);

    try {
      return await this.prisma.gameCopy.create({
        data: dto,
        include: copyResponse,
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateGameCopyDto) {
    const copy = await this.prisma.gameCopy.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!copy) {
      throw new NotFoundException('Game copy not found');
    }

    if (dto.gameId) {
      await this.ensureGameExists(dto.gameId);
    }

    try {
      return await this.prisma.gameCopy.update({
        where: { id },
        data: dto,
        include: copyResponse,
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.gameCopy.delete({ where: { id } });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  private async ensureGameExists(id: string): Promise<void> {
    const game = await this.prisma.game.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }
  }
}
