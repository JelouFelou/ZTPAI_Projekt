import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LoanEvents } from './loan-events.js';
import { LoanEventsListener } from './loan-events.listener.js';
import { NotificationsService } from './notifications.service.js';
import { OverdueLoansScheduler } from './overdue-loans.scheduler.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    LoanEvents,
    LoanEventsListener,
    NotificationsService,
    OverdueLoansScheduler,
  ],
  exports: [LoanEvents],
})
export class NotificationsModule {}
