import type { Loan, LoanStatus } from '@prisma/client';

type LoanWithGameCopy = Pick<
  Loan,
  'id' | 'status' | 'borrowedAt' | 'dueAt' | 'returnedAt'
> & {
  gameCopy: {
    id: string;
    inventoryCode: string;
    game: { id: string; title: string };
  };
};

export function toLoanResponse(loan: LoanWithGameCopy) {
  return {
    id: loan.id,
    status: loan.status satisfies LoanStatus,
    borrowedAt: loan.borrowedAt.toISOString(),
    dueAt: loan.dueAt.toISOString(),
    returnedAt: loan.returnedAt?.toISOString() ?? null,
    gameCopy: loan.gameCopy,
  };
}
