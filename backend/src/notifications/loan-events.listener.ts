import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  LOAN_BORROWED_EVENT,
  LoanBorrowedEvent,
  LoanEvents,
} from './loan-events.js';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class LoanEventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoanEventsListener.name);

  constructor(
    private readonly events: LoanEvents,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly onBorrowed = (event: LoanBorrowedEvent): void => {
    void this.notifications
      .recordBorrowedLoan(event)
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to process borrowed-loan event for ${event.loanId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  };

  onModuleInit(): void {
    this.events.on(LOAN_BORROWED_EVENT, this.onBorrowed);
  }

  onModuleDestroy(): void {
    this.events.off(LOAN_BORROWED_EVENT, this.onBorrowed);
  }
}
