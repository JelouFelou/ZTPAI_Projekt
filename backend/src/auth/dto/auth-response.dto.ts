import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null,
    description: 'No time limit for new sessions',
  })
  expiresIn!: number | null;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
