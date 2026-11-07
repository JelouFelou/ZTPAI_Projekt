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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorEnvelopeDto } from '../common/api-response.dto.js';
import {
  ApiRequestIdHeader,
  ApiStandardServerError,
} from '../common/swagger.decorators.js';
import { AdminOnly } from '../auth/admin-only.decorator.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import {
  GameListResponseDto,
  GameResponseDto,
} from './dto/game-response.dto.js';
import { ListGamesQueryDto } from './dto/list-games-query.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';
import { GamesService } from './games.service.js';

@Controller('games')
@ApiTags('Games')
@ApiRequestIdHeader()
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'Search and list games with pagination' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search title or description',
  })
  @ApiQuery({ name: 'categoryId', required: false, format: 'uuid' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 1000000,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiOkResponse({ type: GameListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  findAll(@Query() query: ListGamesQueryDto) {
    return this.games.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a game by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: GameResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.games.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a game' })
  @ApiCreatedResponse({ type: GameResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({
    type: ApiErrorEnvelopeDto,
    description: 'Category not found',
  })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  @AdminOnly()
  create(@Body() dto: CreateGameDto) {
    return this.games.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a game' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorEnvelopeDto })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  @AdminOnly()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.games.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a game' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorEnvelopeDto })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  @AdminOnly()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.games.remove(id);
  }
}
