import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenResponseDto {
  @ApiProperty({ example: true })
  valid!: true;

  @ApiProperty({ format: 'uuid' })
  userId!: string;
}
