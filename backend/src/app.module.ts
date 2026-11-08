import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { GamesModule } from './games/games.module.js';
import { GameCopiesModule } from './game-copies/game-copies.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LoansModule } from './loans/loans.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CategoriesModule,
    GamesModule,
    GameCopiesModule,
    AuthModule,
    LoansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
