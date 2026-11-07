import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GameCopiesController } from './game-copies.controller.js';
import { GameCopiesService } from './game-copies.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GameCopiesController],
  providers: [GameCopiesService],
})
export class GameCopiesModule {}
