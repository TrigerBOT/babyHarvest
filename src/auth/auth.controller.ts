import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Авторизация')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные',
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким email уже существует',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход в систему',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Неверный email или пароль',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access токена' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Токен успешно обновлен',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Недействительный refresh токен',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение информации о текущем пользователе' })
  @ApiResponse({
    status: 200,
    description: 'Информация о пользователе',
  })
  @ApiResponse({
    status: 401,
    description: 'Неавторизованный доступ',
  })
  async getCurrentUser(@Request() req: { user: { id: string } }) {
    return this.authService.getCurrentUser(req.user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запрос сброса пароля' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Инструкции отправлены на email',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сброс пароля' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Пароль успешно сброшен',
  })
  @ApiResponse({
    status: 400,
    description: 'Недействительный токен сброса',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы' })
  @ApiResponse({
    status: 200,
    description: 'Выход выполнен успешно',
  })
  @ApiResponse({
    status: 401,
    description: 'Неавторизованный доступ',
  })
  async logout() {
    return this.authService.logout();
  }
}
