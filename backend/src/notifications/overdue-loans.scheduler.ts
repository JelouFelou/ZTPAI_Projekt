import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class OverdueLoansScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OverdueLoansScheduler.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly notifications: NotificationsService) {}

  onModuleInit(): void {
    void this.runAndScheduleNext();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  async recordOverdueReminders(): Promise<number> {
    return this.notifications.recordOverdueReminders();
  }

  private scheduleNextRun(): void {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(9, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    this.timer = setTimeout(() => {
      void this.runAndScheduleNext();
    }, nextRun.getTime() - now.getTime());
    this.timer.unref();
  }

  private async runAndScheduleNext(): Promise<void> {
    try {
      await this.recordOverdueReminders();
    } catch (error) {
      this.logger.error(
        'Failed to record overdue loan reminders',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.scheduleNextRun();
    }
  }
}
