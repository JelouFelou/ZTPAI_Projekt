import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { serializableTransaction } from '../common/serializable-transaction.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowPrismaError } from '../common/prisma-errors.js';
import { CreateGameCopyDto } from './dto/create-game-copy.dto.js';
import { UpdateGameCopyDto } from './dto/update-game-copy.dto.js';
import { toGameCopyResponse } from './game-copy.mapper.js';

const copyResponse = {
  game: { select: { id: true, title: true } },
  _count: { select: { loans: { where: { status: 'ACTIVE' } } } },
} as const;

@Injectable()
export class GameCopiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.gameCopy
      .findMany({
        include: copyResponse,
        orderBy: { inventoryCode: 'asc' },
      })
      .then((copies) => copies.map(toGameCopyResponse));
  }

  async findOne(id: string) {
    const copy = await this.prisma.gameCopy.findUnique({
      where: { id },
      include: copyResponse,
    });

    if (!copy) {
      throw new NotFoundException('Game copy not found');
    }

    return toGameCopyResponse(copy);
  }

  async create(dto: CreateGameCopyDto) {
    await this.ensureGameExists(dto.gameId);

    try {
      const copy = await this.prisma.gameCopy.create({
        data: dto,
        include: copyResponse,
      });
      return toGameCopyResponse(copy);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateGameCopyDto) {
    try {
      return await serializableTransaction(this.prisma, async (transaction) => {
        const copy = await transaction.gameCopy.findUnique({
          where: { id },
          select: {
            id: true,
            gameId: true,
            _count: { select: { loans: true } },
          },
        });

        if (!copy) {
          throw new NotFoundException('Game copy not found');
        }

        if (dto.gameId && dto.gameId !== copy.gameId) {
          if (copy._count.loans > 0) {
            throw new ConflictException(
              'Cannot change the game of a copy with loan history',
            );
          }
          const game = await transaction.game.findUnique({
            where: { id: dto.gameId },
            select: { id: true },
          });
          if (!game) throw new NotFoundException('Game not found');
        }

        const updatedCopy = await transaction.gameCopy.update({
          where: { id },
          data: dto,
          include: copyResponse,
        });
        return toGameCopyResponse(updatedCopy);
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
