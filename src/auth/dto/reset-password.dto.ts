import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Токен для сброса пароля',
    example: 'reset-token-123',
  })
  @IsString({ message: 'Токен должен быть строкой' })
  token!: string;

  @ApiProperty({
    description: 'Новый пароль',
    example: 'newpassword123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  password!: string;
}
