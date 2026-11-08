import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
