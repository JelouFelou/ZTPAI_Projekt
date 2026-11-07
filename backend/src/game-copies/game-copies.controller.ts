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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorEnvelopeDto } from '../common/api-response.dto.js';
import {
  ApiRequestIdHeader,
  ApiStandardServerError,
} from '../common/swagger.decorators.js';
import { CreateGameCopyDto } from './dto/create-game-copy.dto.js';
import { GameCopyResponseDto } from './dto/game-copy-response.dto.js';
import { UpdateGameCopyDto } from './dto/update-game-copy.dto.js';
import { GameCopiesService } from './game-copies.service.js';

@Controller('game-copies')
@ApiTags('Game copies')
@ApiRequestIdHeader()
export class GameCopiesController {
  constructor(private readonly gameCopies: GameCopiesService) {}

  @Get()
  @ApiOperation({ summary: 'List physical game copies' })
  @ApiOkResponse({ type: GameCopyResponseDto, isArray: true })
  @ApiStandardServerError()
  findAll() {
    return this.gameCopies.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a game copy by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: GameCopyResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.gameCopies.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a physical game copy' })
  @ApiCreatedResponse({ type: GameCopyResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({
    type: ApiErrorEnvelopeDto,
    description: 'Game not found',
  })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  create(@Body() dto: CreateGameCopyDto) {
    return this.gameCopies.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a physical game copy' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorEnvelopeDto })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGameCopyDto,
  ) {
    return this.gameCopies.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a physical game copy' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorEnvelopeDto })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.gameCopies.remove(id);
  }
}
