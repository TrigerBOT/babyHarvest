# Архитектура NestJS REST API шаблона

## Назначение документа

Этот документ описывает общую архитектуру NestJS REST API шаблона, принципы организации кода, используемые паттерны проектирования и структуру приложения.

## Обзор архитектуры

### Модульная архитектура

NestJS использует модульную архитектуру, где каждый модуль инкапсулирует связанную функциональность. Это обеспечивает:

- **Разделение ответственности** - каждый модуль отвечает за свою область
- **Переиспользование кода** - модули можно легко использовать в других частях приложения
- **Тестируемость** - модули можно тестировать изолированно
- **Масштабируемость** - легко добавлять новые модули без изменения существующих

### Слои приложения

Приложение организовано в следующие слои:

```
┌─────────────────────────────────────┐
│         Controller Layer             │  ← HTTP запросы/ответы
│  (Обработка HTTP, валидация)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Service Layer                │  ← Бизнес-логика
│  (Обработка данных, валидация)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Repository/Entity Layer         │  ← Работа с БД
│  (TypeORM Entities, Queries)        │
└─────────────────────────────────────┘
```

#### 1. Controller Layer (Контроллеры)

**Назначение**: Обработка HTTP запросов и ответов

**Ответственность**:
- Прием HTTP запросов
- Валидация входных данных через DTO
- Вызов сервисов для обработки бизнес-логики
- Формирование HTTP ответов
- Документирование API через Swagger декораторы

**Пример**:
```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
```

#### 2. Service Layer (Сервисы)

**Назначение**: Бизнес-логика приложения

**Ответственность**:
- Реализация бизнес-логики
- Координация между различными компонентами
- Валидация данных на уровне бизнес-правил
- Обработка ошибок

**Пример**:
```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    // Бизнес-логика входа
    return tokens;
  }
}
```

#### 3. Repository/Entity Layer (Сущности и репозитории)

**Назначение**: Работа с базой данных

**Ответственность**:
- Определение структуры данных (Entities)
- Выполнение запросов к БД
- Маппинг данных из БД в объекты приложения

**Пример**:
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;
}
```

## Dependency Injection (DI)

NestJS использует мощную систему Dependency Injection, основанную на декораторах TypeScript.

### Принципы DI

1. **Инверсия зависимостей** - классы зависят от абстракций, а не от конкретных реализаций
2. **Автоматическое управление зависимостями** - NestJS автоматически создает и внедряет зависимости
3. **Singleton по умолчанию** - все провайдеры создаются один раз и переиспользуются

### Пример использования

```typescript
// Сервис с зависимостями
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,  // Внедрение через конструктор
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
}

// Модуль регистрирует провайдеры
@Module({
  providers: [AuthService, UsersService, JwtService],
  // NestJS автоматически разрешит зависимости
})
export class AuthModule {}
```

## Паттерны проектирования

### 1. Module Pattern (Модульный паттерн)

Каждый функциональный модуль содержит:
- `*.module.ts` - определение модуля
- `*.controller.ts` - контроллеры
- `*.service.ts` - сервисы
- `dto/` - Data Transfer Objects
- `guards/` - guards для защиты роутов
- `strategies/` - стратегии аутентификации

### 2. Repository Pattern (Паттерн репозитория)

TypeORM предоставляет репозитории для работы с БД:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }
}
```

### 3. Strategy Pattern (Паттерн стратегии)

Используется для аутентификации через Passport:

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    // Стратегия валидации JWT токена
  }
}
```

### 4. DTO Pattern (Data Transfer Object)

DTO используются для:
- Валидации входных данных
- Документирования API
- Типизации данных

```typescript
export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;
}
```

## Структура проекта

```
src/
├── app.module.ts              # Главный модуль приложения
├── main.ts                    # Точка входа
│
├── auth/                      # Модуль аутентификации
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/                   # Data Transfer Objects
│   ├── guards/                # Guards для защиты роутов
│   └── strategies/            # Passport стратегии
│
├── users/                     # Модуль пользователей
│   ├── users.module.ts
│   └── users.service.ts
│
├── database/                  # Модуль базы данных
│   ├── database.module.ts
│   └── entities/             # TypeORM сущности
│
└── common/                    # Общие компоненты
    ├── decorators/            # Кастомные декораторы
    ├── filters/               # Exception filters
    ├── guards/                # Общие guards
    ├── interceptors/          # Interceptors
    ├── pipes/                 # Custom pipes
    └── utils/                 # Утилиты
```

## Принципы организации кода

### 1. Single Responsibility Principle (SRP)

Каждый класс должен иметь одну причину для изменения:

- **Controller** - только обработка HTTP
- **Service** - только бизнес-логика
- **Repository** - только работа с БД

### 2. Separation of Concerns (Разделение ответственности)

Разделение на слои обеспечивает:
- Легкость тестирования
- Простоту поддержки
- Возможность замены компонентов

### 3. DRY (Don't Repeat Yourself)

- Общая логика выносится в сервисы
- Переиспользование через DI
- Общие компоненты в `common/`

### 4. Type Safety (Типобезопасность)

TypeScript обеспечивает:
- Строгую типизацию
- Проверку типов на этапе компиляции
- Автодополнение в IDE

## Конфигурация

### Environment Variables

Конфигурация через переменные окружения:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
```

### Использование конфигурации

```typescript
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  getSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }
}
```

## Безопасность

### 1. Аутентификация

- JWT токены для stateless аутентификации
- Refresh tokens для обновления сессий
- Passport стратегии для валидации

### 2. Валидация данных

- Валидация на уровне DTO через `class-validator`
- Валидация на уровне сервисов
- Защита от SQL injection через TypeORM

### 3. Rate Limiting

Ограничение частоты запросов через `@nestjs/throttler`:

```typescript
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {}
```

## Документация API

### Swagger/OpenAPI

Автоматическая генерация документации:

```typescript
@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto) {}
}
```

Документация доступна по адресу: `http://localhost:3000/docs`

## Тестирование

### Типы тестов

1. **Unit тесты** - тестирование отдельных компонентов
2. **Integration тесты** - тестирование взаимодействия компонентов
3. **E2E тесты** - тестирование полного потока через HTTP

### Структура тестов

```
test/
├── unit/           # Unit тесты
├── integration/    # Integration тесты
└── e2e/            # E2E тесты
```

## Миграции базы данных

TypeORM поддерживает миграции для управления схемой БД:

```bash
# Генерация миграции
npm run migration:generate -- -n MigrationName

# Применение миграций
npm run migration:run

# Откат миграции
npm run migration:revert
```

## Best Practices

1. **Используйте модули** - группируйте связанную функциональность
2. **Валидируйте данные** - всегда валидируйте входные данные
3. **Обрабатывайте ошибки** - используйте exception filters
4. **Документируйте API** - используйте Swagger декораторы
5. **Пишите тесты** - покрывайте код тестами
6. **Следуйте конвенциям** - используйте соглашения NestJS
7. **Типизируйте все** - используйте TypeScript типы
8. **Разделяйте ответственность** - каждый класс одна ответственность

## Связанные документы

- [MODULE_STRUCTURE.md](./MODULE_STRUCTURE.md) - Детальная структура модулей
- [ADDING_CONTROLLERS.md](../development/ADDING_CONTROLLERS.md) - Гайд по добавлению контроллеров
- [ADDING_FEATURES.md](../development/ADDING_FEATURES.md) - Гайд по внедрению фич
- [TESTING_GUIDE.md](../testing/TESTING_GUIDE.md) - Гайд по тестированию

