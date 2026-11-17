import { EventEmitter } from 'node:events';
import { Injectable } from '@nestjs/common';

export const LOAN_BORROWED_EVENT = 'loans.borrowed';

export interface LoanBorrowedEvent {
  loanId: string;
  userId: string;
  gameTitle: string;
  inventoryCode: string;
  dueAt: string;
}

@Injectable()
export class LoanEvents extends EventEmitter {
  emitBorrowed(event: LoanBorrowedEvent): void {
    setImmediate(() => this.emit(LOAN_BORROWED_EVENT, event));
  }
}
