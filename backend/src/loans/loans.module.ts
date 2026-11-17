import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
