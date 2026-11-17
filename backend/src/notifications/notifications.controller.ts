import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiErrorEnvelopeDto } from '../common/api-response.dto.js';
import {
  ApiRequestIdHeader,
  ApiStandardServerError,
} from '../common/swagger.decorators.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationListResponseDto } from './dto/notification-response.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@ApiTags('Notifications')
@ApiRequestIdHeader()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List only your notifications, newest first' })
  @ApiOkResponse({ type: NotificationListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  findMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.findMine(user.id, query);
  }
}
