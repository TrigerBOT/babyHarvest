import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access токен для аутентификации',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh токен для обновления access токена',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Время истечения access токена в секундах',
    example: 3600,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Информация о пользователе',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID пользователя' },
      email: { type: 'string', description: 'Email пользователя' },
      name: { type: 'string', description: 'Имя пользователя', required: false },
      avatar: { type: 'string', description: 'URL аватара', required: false },
    },
  })
  user!: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
}
