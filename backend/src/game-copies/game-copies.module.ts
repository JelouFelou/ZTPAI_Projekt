import { Module } from '@nestjs/common';
import { GameCopiesController } from './game-copies.controller.js';
import { GameCopiesService } from './game-copies.service.js';

@Module({
  controllers: [GameCopiesController],
  providers: [GameCopiesService],
})
export class GameCopiesModule {}
