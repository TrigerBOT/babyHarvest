# Структура модулей

## Назначение документа

Этот документ описывает детальную структуру модулей в NestJS приложении, принципы организации кода внутри модуля и примеры из существующих модулей.

## Общая структура модуля

Каждый функциональный модуль в приложении следует единой структуре:

```
module-name/
├── module-name.module.ts      # Определение модуля
├── module-name.controller.ts  # HTTP контроллер
├── module-name.service.ts     # Бизнес-логика
├── dto/                       # Data Transfer Objects
│   ├── create-module.dto.ts
│   ├── update-module.dto.ts
│   └── module-response.dto.ts
├── guards/                    # Guards (если нужны)
│   └── module.guard.ts
├── strategies/                # Passport стратегии (если нужны)
│   └── module.strategy.ts
└── interfaces/                # TypeScript интерфейсы (опционально)
    └── module.interface.ts
```

## Компоненты модуля

### 1. Module File (`*.module.ts`)

**Назначение**: Определение модуля, регистрация провайдеров, импорты и экспорты

**Структура**:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { Entity } from '../database/entities/entity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entity]),  // Регистрация entities
    OtherModule,                         // Импорт других модулей
  ],
  controllers: [ModuleController],       // Регистрация контроллеров
  providers: [ModuleService],            // Регистрация сервисов
  exports: [ModuleService],              // Экспорт для использования в других модулях
})
export class ModuleModule {}
```

**Пример из проекта** (`auth/auth.module.ts`):
```typescript
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({...}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### 2. Controller File (`*.controller.ts`)

**Назначение**: Обработка HTTP запросов, валидация, формирование ответов

**Структура**:
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ModuleService } from './module.service';
import { CreateModuleDto } from './dto/create-module.dto';

@ApiTags('Module Name')
@Controller('module')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Создание ресурса' })
  @ApiResponse({ status: 201, description: 'Ресурс создан' })
  async create(@Body() createDto: CreateModuleDto) {
    return this.moduleService.create(createDto);
  }
}
```

**Пример из проекта** (`auth/auth.controller.ts`):
```typescript
@ApiTags('Авторизация')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
```

### 3. Service File (`*.service.ts`)

**Назначение**: Бизнес-логика, координация между компонентами

**Структура**:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity } from '../database/entities/entity.entity';
import { CreateModuleDto } from './dto/create-module.dto';

@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(Entity)
    private entityRepository: Repository<Entity>,
  ) {}

  async create(createDto: CreateModuleDto): Promise<Entity> {
    // Бизнес-логика
    const entity = this.entityRepository.create(createDto);
    return this.entityRepository.save(entity);
  }
}
```

**Пример из проекта** (`auth/auth.service.ts`):
```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    // Бизнес-логика входа
    return tokens;
  }
}
```

### 4. DTO (Data Transfer Objects)

**Назначение**: Валидация данных, типизация, документация API

**Структура DTO**:
```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({
    description: 'Название',
    example: 'Example Name',
  })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({
    description: 'Email',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;
}
```

**Примеры из проекта**:

`auth/dto/login.dto.ts`:
```typescript
export class LoginDto {
  @ApiProperty({ description: 'Email пользователя' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;

  @ApiProperty({ description: 'Пароль пользователя' })
  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password!: string;
}
```

`auth/dto/auth-response.dto.ts`:
```typescript
export class AuthResponseDto {
  @ApiProperty({ description: 'Access токен' })
  accessToken!: string;

  @ApiProperty({ description: 'Refresh токен' })
  refreshToken!: string;

  @ApiProperty({ description: 'Время истечения в секундах' })
  expiresIn!: number;

  @ApiProperty({ description: 'Информация о пользователе' })
  user!: {
    id: string;
    email: string;
    name?: string;
  };
}
```

### 5. Guards

**Назначение**: Защита роутов, проверка прав доступа

**Структура Guard**:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ModuleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Логика проверки
    return true;
  }
}
```

**Пример из проекта** (`auth/guards/jwt-auth.guard.ts`):
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Использование**:
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
async getProtected() {
  return 'Protected data';
}
```

### 6. Strategies (Passport)

**Назначение**: Стратегии аутентификации для Passport

**Структура Strategy**:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Конфигурация стратегии
    });
  }

  async validate(payload: any) {
    // Валидация и возврат пользователя
    return user;
  }
}
```

**Пример из проекта** (`auth/strategies/jwt.strategy.ts`):
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    return user;
  }
}
```

## Пример: Модуль Auth

Полная структура модуля `auth`:

```
auth/
├── auth.module.ts
│   └── Регистрация: AuthController, AuthService, JwtStrategy
│
├── auth.controller.ts
│   ├── POST /auth/register
│   ├── POST /auth/login
│   ├── POST /auth/refresh
│   ├── GET /auth/me
│   ├── POST /auth/logout
│   ├── POST /auth/forgot-password
│   └── POST /auth/reset-password
│
├── auth.service.ts
│   ├── register()
│   ├── login()
│   ├── refreshToken()
│   ├── getCurrentUser()
│   ├── forgotPassword()
│   ├── resetPassword()
│   └── logout()
│
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   ├── refresh-token.dto.ts
│   ├── forgot-password.dto.ts
│   ├── reset-password.dto.ts
│   └── auth-response.dto.ts
│
├── guards/
│   └── jwt-auth.guard.ts
│
└── strategies/
    └── jwt.strategy.ts
```

## Пример: Модуль Users

Структура модуля `users`:

```
users/
├── users.module.ts
│   └── Регистрация: UsersService, TypeOrmModule.forFeature([User])
│
└── users.service.ts
    ├── createUser()
    ├── findByEmail()
    ├── findById()
    ├── validatePassword()
    ├── updateProfile()
    ├── updatePassword()
    └── deleteUser()
```

## Принципы организации

### 1. Один модуль - одна ответственность

Каждый модуль отвечает за одну функциональную область:
- `auth` - аутентификация и авторизация
- `users` - управление пользователями
- `database` - работа с базой данных

### 2. Минимальные зависимости между модулями

Модули должны быть максимально независимыми. Зависимости только через:
- Импорт других модулей
- Экспорт сервисов для переиспользования

### 3. Явные зависимости

Все зависимости должны быть явно объявлены через конструктор:

```typescript
constructor(
  private readonly service: Service,  // Явная зависимость
) {}
```

### 4. Типизация везде

Используйте TypeScript типы для всех данных:
- DTO для валидации
- Интерфейсы для контрактов
- Типы для возвращаемых значений

## Best Practices

1. **Именование файлов**: Используйте kebab-case для файлов (`auth.controller.ts`)
2. **Именование классов**: Используйте PascalCase для классов (`AuthController`)
3. **Организация DTO**: Группируйте DTO в папке `dto/`
4. **Документация**: Используйте Swagger декораторы для всех endpoints
5. **Валидация**: Всегда валидируйте входные данные через DTO
6. **Обработка ошибок**: Используйте стандартные исключения NestJS
7. **Экспорт сервисов**: Экспортируйте сервисы, если они используются в других модулях

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [ADDING_CONTROLLERS.md](../development/ADDING_CONTROLLERS.md) - Гайд по добавлению контроллеров
- [ADDING_FEATURES.md](../development/ADDING_FEATURES.md) - Гайд по внедрению фич

