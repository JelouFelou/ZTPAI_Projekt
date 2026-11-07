import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      throw new NotFoundException('Resource not found');
    }

    if (error.code === 'P2002') {
      throw new ConflictException('A resource with this value already exists');
    }

    if (error.code === 'P2003') {
      throw new ConflictException('Resource is still referenced by other data');
    }
  }

  throw error;
}
