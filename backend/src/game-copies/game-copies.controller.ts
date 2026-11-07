import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateGameCopyDto } from './dto/create-game-copy.dto.js';
import { UpdateGameCopyDto } from './dto/update-game-copy.dto.js';
import { GameCopiesService } from './game-copies.service.js';

@Controller('game-copies')
export class GameCopiesController {
  constructor(private readonly gameCopies: GameCopiesService) {}

  @Get()
  findAll() {
    return this.gameCopies.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.gameCopies.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGameCopyDto) {
    return this.gameCopies.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGameCopyDto,
  ) {
    return this.gameCopies.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.gameCopies.remove(id);
  }
}
