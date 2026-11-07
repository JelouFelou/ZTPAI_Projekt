import { PartialType } from '@nestjs/swagger';
import { CreateGameCopyDto } from './create-game-copy.dto.js';

export class UpdateGameCopyDto extends PartialType(CreateGameCopyDto, {
  skipNullProperties: false,
}) {}
