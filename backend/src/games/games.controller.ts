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
import { CreateGameDto } from './dto/create-game.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';
import { GamesService } from './games.service.js';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  findAll() {
    return this.games.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.games.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.games.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.games.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.games.remove(id);
  }
}
