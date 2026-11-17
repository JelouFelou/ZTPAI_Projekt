import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { PaginationResponseDto } from '../../common/api-response.dto.js';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ maxLength: 500 })
  message!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination!: PaginationResponseDto;
}
