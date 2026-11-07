import type { Category, Game } from '@prisma/client';
import { toCategoryResponse } from '../categories/category.mapper.js';
import type { GameResponseDto } from './dto/game-response.dto.js';

type GameWithCategory = Game & { category: Category };

export function toGameResponse(game: GameWithCategory): GameResponseDto {
  return {
    id: game.id,
    title: game.title,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    recommendedAge: game.recommendedAge,
    durationMinutes: game.durationMinutes,
    categoryId: game.categoryId,
    category: toCategoryResponse(game.category),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}
