# Чистота кода и типизация

## Назначение документа

Этот документ описывает best practices для написания чистого, типобезопасного кода в NestJS приложении, включая использование TypeScript, обработку ошибок, валидацию данных и поддержание качества кода.

## TypeScript Best Practices

### Строгая типизация

Всегда используйте строгую типизацию:

```typescript
// ✅ Хорошо
function getUser(id: string): Promise<User> {
  return this.userRepository.findOne({ where: { id } });
}

// ❌ Плохо
function getUser(id: any): any {
  return this.userRepository.findOne({ where: { id } });
}
```

### Использование типов и интерфейсов

#### Интерфейсы для контрактов

```typescript
// Определение интерфейса
interface UserResponse {
  id: string;
  email: string;
  name?: string;
}

// Использование
function getUser(): UserResponse {
  return { id: '1', email: 'user@example.com' };
}
```

#### Типы для объединений

```typescript
type Status = 'active' | 'inactive' | 'pending';

type UserRole = 'admin' | 'user' | 'moderator';
```

#### Типы для утилит

```typescript
// Omit - исключить поля
type UserWithoutPassword = Omit<User, 'password'>;

// Pick - выбрать поля
type UserPublic = Pick<User, 'id' | 'email' | 'name'>;

// Partial - все поля опциональны
type UserUpdate = Partial<User>;
```

### Non-null assertion operator (!)

Используйте осторожно, только когда уверены, что значение не null:

```typescript
// ✅ Хорошо - когда точно знаем, что значение есть
@Column()
email!: string;  // В Entity, значение будет после создания

// ❌ Плохо - когда значение может быть undefined
const user = await this.findUser(id);
user!.email;  // Небезопасно
```

### Optional chaining и nullish coalescing

```typescript
// Optional chaining
const name = user?.profile?.name;

// Nullish coalescing
const displayName = user?.name ?? 'Anonymous';
```

### Типизация в DTO

```typescript
export class CreateUserDto {
  @IsEmail()
  email!: string;  // ! означает обязательное поле

  @IsOptional()
  @IsString()
  name?: string;  // ? означает опциональное поле
}
```

## Обработка ошибок

### Использование стандартных исключений NestJS

```typescript
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

// 400 - Некорректный запрос
throw new BadRequestException('Некорректные данные');

// 401 - Неавторизован
throw new UnauthorizedException('Неверный токен');

// 403 - Доступ запрещен
throw new ForbiddenException('Нет доступа к ресурсу');

// 404 - Не найдено
throw new NotFoundException('Пользователь не найден');

// 409 - Конфликт
throw new ConflictException('Пользователь уже существует');

// 500 - Внутренняя ошибка
throw new InternalServerErrorException('Внутренняя ошибка сервера');
```

### Кастомные исключения

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        details,
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

### Обработка ошибок в сервисах

```typescript
@Injectable()
export class UsersService {
  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      throw new NotFoundException(`Пользователь с email ${email} не найден`);
    }
    
    return user;
  }
}
```

## Валидация данных

### Валидация через class-validator

```typescript
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @IsEnum(['admin', 'user'])
  role!: 'admin' | 'user';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
```

### Валидация вложенных объектов

```typescript
class AddressDto {
  @IsString()
  street!: string;

  @IsString()
  city!: string;
}

class CreateUserDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
```

### Валидация массивов

```typescript
@IsArray()
@IsString({ each: true })
tags!: string[];
```

### Кастомная валидация

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы и цифры';
        },
      },
    });
  };
}

// Использование
export class CreateUserDto {
  @IsStrongPassword()
  password!: string;
}
```

## Линтинг и форматирование

### ESLint конфигурация

Убедитесь, что в проекте настроен ESLint:

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Запуск линтера

```bash
npm run lint
npm run lint:fix
```

### Prettier для форматирования

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## Примеры хорошего и плохого кода

### Пример 1: Типизация

```typescript
// ❌ Плохо
async getUser(id) {
  const user = await this.repository.findOne({ where: { id } });
  return user;
}

// ✅ Хорошо
async getUser(id: string): Promise<User | null> {
  const user = await this.userRepository.findOne({ where: { id } });
  return user;
}
```

### Пример 2: Обработка ошибок

```typescript
// ❌ Плохо
async login(email: string, password: string) {
  const user = await this.findByEmail(email);
  if (user.password !== password) {
    return { error: 'Wrong password' };
  }
  return user;
}

// ✅ Хорошо
async login(loginDto: LoginDto): Promise<AuthResponseDto> {
  const user = await this.usersService.findByEmail(loginDto.email);
  if (!user) {
    throw new UnauthorizedException('Неверный email или пароль');
  }

  const isPasswordValid = await this.usersService.validatePassword(
    loginDto.password,
    user.password,
  );
  if (!isPasswordValid) {
    throw new UnauthorizedException('Неверный email или пароль');
  }

  return this.generateTokens(user);
}
```

### Пример 3: Валидация

```typescript
// ❌ Плохо
async create(data: any) {
  if (!data.email || !data.email.includes('@')) {
    return { error: 'Invalid email' };
  }
  // ...
}

// ✅ Хорошо
async create(createDto: CreateUserDto): Promise<User> {
  // Валидация происходит автоматически через ValidationPipe
  const user = this.userRepository.create(createDto);
  return this.userRepository.save(user);
}
```

### Пример 4: Работа с базой данных

```typescript
// ❌ Плохо
async getUser(id: string) {
  const users = await this.repository.find();
  return users.find(u => u.id === id);
}

// ✅ Хорошо
async getUser(id: string): Promise<User | null> {
  return this.userRepository.findOne({ where: { id } });
}
```

### Пример 5: Асинхронность

```typescript
// ❌ Плохо
async getUsers() {
  const users = [];
  const ids = await this.getIds();
  for (const id of ids) {
    const user = await this.getUser(id);
    users.push(user);
  }
  return users;
}

// ✅ Хорошо
async getUsers(): Promise<User[]> {
  const ids = await this.getIds();
  return Promise.all(ids.map(id => this.getUser(id)));
}
```

## Организация кода

### Именование

```typescript
// ✅ Хорошо
class UserService {}
class AuthController {}
interface UserResponse {}
type UserStatus = 'active' | 'inactive';

// ❌ Плохо
class userService {}
class auth_controller {}
interface userResponse {}
```

### Структура файлов

```typescript
// ✅ Хорошо - логический порядок
import { Injectable } from '@nestjs/common';  // NestJS
import { InjectRepository } from '@nestjs/typeorm';  // NestJS TypeORM
import { Repository } from 'typeorm';  // TypeORM
import { User } from '../database/entities/user.entity';  // Локальные импорты
import { CreateUserDto } from './dto/create-user.dto';
```

### Комментарии

```typescript
// ✅ Хорошо - JSDoc комментарии
/**
 * Создание нового пользователя
 * @param createDto - Данные для создания пользователя
 * @returns Созданный пользователь без пароля
 */
async createUser(createDto: CreateUserDto): Promise<Omit<User, 'password'>> {
  // ...
}

// ❌ Плохо - избыточные комментарии
// Создаем пользователя
async createUser(createDto: CreateUserDto) {
  // Создаем пользователя в базе
  const user = await this.repository.save(createDto);
  // Возвращаем пользователя
  return user;
}
```

## Константы и конфигурация

### Использование констант

```typescript
// ✅ Хорошо
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 50;

@MinLength(PASSWORD_MIN_LENGTH)
@MaxLength(PASSWORD_MAX_LENGTH)
password!: string;

// ❌ Плохо
@MinLength(6)
@MaxLength(50)
password!: string;
```

### Конфигурация через ConfigService

```typescript
// ✅ Хорошо
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'default-secret';
  }
}
```

## Best Practices

1. **Всегда типизируйте** - используйте TypeScript типы везде
2. **Валидируйте данные** - используйте DTO и class-validator
3. **Обрабатывайте ошибки** - используйте правильные исключения
4. **Используйте async/await** - избегайте callback hell
5. **Избегайте any** - используйте конкретные типы
6. **Следуйте конвенциям** - используйте соглашения NestJS
7. **Пишите чистый код** - код должен быть читаемым
8. **Документируйте** - используйте JSDoc для сложных функций
9. **Тестируйте** - пишите тесты для критичной логики
10. **Рефакторинг** - регулярно улучшайте код

## Связанные документы

- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - Общая архитектура
- [ADDING_CONTROLLERS.md](./ADDING_CONTROLLERS.md) - Гайд по контроллерам
- [ADDING_FEATURES.md](./ADDING_FEATURES.md) - Гайд по внедрению фич
- [TESTING_GUIDE.md](../testing/TESTING_GUIDE.md) - Гайд по тестированию

