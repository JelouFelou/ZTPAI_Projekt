import { PartialType } from '@nestjs/mapped-types';
import { CreateGameCopyDto } from './create-game-copy.dto.js';

export class UpdateGameCopyDto extends PartialType(CreateGameCopyDto) {}
