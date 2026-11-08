import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorEnvelopeDto } from '../common/api-response.dto.js';
import {
  ApiRequestIdHeader,
  ApiStandardServerError,
} from '../common/swagger.decorators.js';
import type { AuthUser } from './auth-user.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyTokenResponseDto } from './dto/verify-token-response.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@ApiTags('Authentication')
@ApiRequestIdHeader()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a member account' })
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiConflictResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify the current access token' })
  @ApiOkResponse({ type: VerifyTokenResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  verifyToken(@CurrentUser() user: AuthUser) {
    return this.auth.verifyToken(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorEnvelopeDto })
  @ApiStandardServerError()
  getCurrentUser(@CurrentUser() user: AuthUser) {
    return this.auth.getCurrentUser(user);
  }
}
