import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email пользователя для сброса пароля',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;
}
