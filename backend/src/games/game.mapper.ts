import type { Category, Game } from '@prisma/client';
import { toCategoryResponse } from '../categories/category.mapper.js';
import type { GameResponseDto } from './dto/game-response.dto.js';

type GameWithCategory = Game & {
  category: Category;
  _count: { copies: number };
  copies: { inventoryCode: string; loans: { dueAt: Date }[] }[];
};

export function toGameResponse(game: GameWithCategory): GameResponseDto {
  const expectedReturns = game.copies
    .flatMap((copy) =>
      copy.loans.map((loan) => ({
        inventoryCode: copy.inventoryCode,
        dueAt: loan.dueAt.toISOString(),
      })),
    )
    .sort(
      (a, b) =>
        a.dueAt.localeCompare(b.dueAt) ||
        a.inventoryCode.localeCompare(b.inventoryCode),
    );
  return {
    id: game.id,
    title: game.title,
    description: game.description,
    occasion: game.occasion,
    difficulty: game.difficulty,
    gameplay: game.gameplay,
    highlights: game.highlights,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    recommendedAge: game.recommendedAge,
    durationMinutes: game.durationMinutes,
    categoryId: game.categoryId,
    category: toCategoryResponse(game.category),
    availableCopies: game._count.copies,
    borrowedCopies: expectedReturns.length,
    expectedReturns,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}
