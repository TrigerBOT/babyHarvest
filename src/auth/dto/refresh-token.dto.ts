import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh токен для обновления access токена',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh токен должен быть строкой' })
  refreshToken!: string;
}
