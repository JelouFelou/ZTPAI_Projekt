import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowPrismaError } from '../common/prisma-errors.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { toCategoryResponse } from './category.mapper.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category
      .findMany({ orderBy: { name: 'asc' } })
      .then((categories) => categories.map(toCategoryResponse));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return toCategoryResponse(category);
  }

  async create(dto: CreateCategoryDto) {
    try {
      const category = await this.prisma.category.create({ data: dto });
      return toCategoryResponse(category);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: dto,
      });
      return toCategoryResponse(category);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
