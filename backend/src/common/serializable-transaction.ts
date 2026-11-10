import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

// Retry the entire decision after a concurrent transaction changes its inputs.
export async function serializableTransaction<T>(
  prisma: PrismaService,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let acquisitionFailed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    let started = false;
    try {
      return await prisma.$transaction(
        (transaction) => {
          started = true;
          return operation(transaction);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
        throw error;
      }
      // P2028 covers several transaction errors. Only retry it when no application
      // code ran: acquiring a connection timed out before the callback started.
      acquisitionFailed = error.code === 'P2028' && !started;
      if (error.code !== 'P2034' && !acquisitionFailed) throw error;
    }
  }
  if (acquisitionFailed) {
    throw new ServiceUnavailableException('Database is busy; please try again');
  }
  throw new ConflictException('Concurrent modification; please try again');
}
