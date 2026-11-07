import type { Category } from '@prisma/client';
import type { CategoryResponseDto } from './dto/category-response.dto.js';

export function toCategoryResponse(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
