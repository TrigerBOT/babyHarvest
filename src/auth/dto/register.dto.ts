import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email пользователя',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;

  @ApiProperty({
    description: 'Пароль пользователя',
    example: 'password123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  password!: string;

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'Иван Иванов',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой' })
  @MaxLength(100, { message: 'Имя не должно превышать 100 символов' })
  name?: string;
}
