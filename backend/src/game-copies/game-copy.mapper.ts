import type { GameCopy } from '@prisma/client';
import type { GameCopyResponseDto } from './dto/game-copy-response.dto.js';

type GameCopyWithGame = GameCopy & {
  game: { id: string; title: string };
  _count: { loans: number };
};

export function toGameCopyResponse(
  copy: GameCopyWithGame,
): GameCopyResponseDto {
  return {
    id: copy.id,
    inventoryCode: copy.inventoryCode,
    status: copy.status,
    isAvailable: copy.status === 'AVAILABLE' && copy._count.loans === 0,
    gameId: copy.gameId,
    game: {
      id: copy.game.id,
      title: copy.game.title,
    },
    createdAt: copy.createdAt.toISOString(),
    updatedAt: copy.updatedAt.toISOString(),
  };
}
