import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Регистрация нового пользователя
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name } = registerDto;

    // Создаем пользователя
    const user = await this.usersService.createUser(email, password, name);

    // Генерируем токены
    const tokens = await this.generateTokens(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Вход в систему
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Находим пользователя
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Проверяем пароль
    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Генерируем токены
    const tokens = await this.generateTokens(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Обновление токенов
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Проверяем refresh токен
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Находим пользователя
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      // Генерируем новые токены
      const tokens = await this.generateTokens(user.id);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      };
    } catch {
      throw new UnauthorizedException('Недействительный refresh токен');
    }
  }

  /**
   * Получение текущего пользователя
   */
  async getCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Запрос сброса пароля
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Не раскрываем информацию о существовании пользователя
      return { message: 'Если пользователь с таким email существует, инструкции отправлены на почту' };
    }

    // TODO: Реализовать отправку email с токеном сброса
    // Пока что просто возвращаем сообщение
    return { message: 'Если пользователь с таким email существует, инструкции отправлены на почту' };
  }

  /**
   * Сброс пароля
   */
  async resetPassword(_token: string, _newPassword: string): Promise<{ message: string }> {
    // TODO: Реализовать проверку токена сброса пароля
    // Пока что просто возвращаем ошибку
    throw new BadRequestException('Функция сброса пароля будет реализована в следующих версиях');
  }

  /**
   * Выход из системы
   */
  async logout(): Promise<{ message: string }> {
    // TODO: Реализовать blacklist токенов
    return { message: 'Выход выполнен успешно' };
  }

  /**
   * Генерация access и refresh токенов
   */
  private async generateTokens(userId: string) {
    const payload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '1h') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
      }),
    ]);

    const expiresIn = this.getTokenExpirationTime(
      this.configService.get<string>('JWT_EXPIRES_IN', '1h')
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Получение времени истечения токена в секундах
   */
  private getTokenExpirationTime(expiresIn: string): number {
    const timeUnit = expiresIn.slice(-1);
    const timeValue = parseInt(expiresIn.slice(0, -1));

    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 60 * 60;
      case 'd':
        return timeValue * 60 * 60 * 24;
      default:
        return 3600; // 1 час по умолчанию
    }
  }
}
