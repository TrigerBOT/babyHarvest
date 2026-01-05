# Гайд по тестированию

## Назначение документа

Этот документ описывает различные типы тестов в NestJS приложении, как их писать, использовать моки и стабы, и как измерять покрытие кода.

## Быстрый старт

**Новичок в тестировании?** Начните с [HOW_TO_WRITE_TESTS.md](./HOW_TO_WRITE_TESTS.md) - подробный пошаговый гайд с примерами на модуле `pregnancy`.

Этот документ содержит:
- Алгоритм создания unit тестов
- Алгоритм создания e2e тестов
- Полные примеры кода
- Лучшие практики
- Чек-листы

## Типы тестов

### 1. Unit тесты

**Назначение**: Тестирование отдельных компонентов изолированно

**Когда использовать**:
- Тестирование сервисов
- Тестирование утилит
- Тестирование бизнес-логики

**Пример**: Тестирование сервиса

```typescript
// test/unit/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/database/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      const user = { id: '1', email: 'test@example.com', password: 'hash' };
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create and return a user', async () => {
      const createDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      const createdUser = { id: '1', ...createDto, password: 'hashed' };
      const userWithoutPassword = { id: '1', email: createDto.email, name: createDto.name };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(
        createDto.email,
        createDto.password,
        createDto.name,
      );

      expect(result).toEqual(userWithoutPassword);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = { id: '1', email: 'existing@example.com' };
      mockRepository.findOne.mockResolvedValue(existingUser);

      await expect(
        service.createUser('existing@example.com', 'password123'),
      ).rejects.toThrow('Пользователь с таким email уже существует');
    });
  });
});
```

### 2. Integration тесты

**Назначение**: Тестирование взаимодействия компонентов

**Когда использовать**:
- Тестирование модулей
- Тестирование взаимодействия сервисов
- Тестирование работы с базой данных

**Пример**: Тестирование модуля

```typescript
// test/integration/auth.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../src/auth/auth.module';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/database/entities/user.entity';

describe('Auth Integration', () => {
  let module: TestingModule;
  let authService: AuthService;
  let usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        AuthModule,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('register and login flow', () => {
    it('should register user and then login', async () => {
      // Регистрация
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const registerResult = await authService.register(registerDto);
      expect(registerResult).toHaveProperty('accessToken');
      expect(registerResult).toHaveProperty('refreshToken');
      expect(registerResult.user.email).toBe(registerDto.email);

      // Вход
      const loginResult = await authService.login({
        email: registerDto.email,
        password: registerDto.password,
      });

      expect(loginResult).toHaveProperty('accessToken');
      expect(loginResult.user.email).toBe(registerDto.email);
    });
  });
});
```

### 3. E2E тесты

**Назначение**: Тестирование полного потока через HTTP

**Когда использовать**:
- Тестирование API endpoints
- Тестирование полных сценариев
- Тестирование интеграции с внешними сервисами

**Пример**: E2E тест для Auth

```typescript
// test/auth/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('test@example.com');
        });
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login User',
        });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'me@example.com',
          password: 'password123',
          name: 'Me User',
        });

      accessToken = response.body.accessToken;
    });

    it('should return user info with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', 'me@example.com');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });
});
```

## Моки и стабы

### Моки для репозиториев

```typescript
import { getRepositoryToken } from '@nestjs/typeorm';

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

{
  provide: getRepositoryToken(User),
  useValue: mockRepository,
}
```

### Моки для сервисов

```typescript
const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  validatePassword: jest.fn(),
};

{
  provide: UsersService,
  useValue: mockUsersService,
}
```

### Моки для ConfigService

```typescript
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
    };
    return config[key];
  }),
};

{
  provide: ConfigService,
  useValue: mockConfigService,
}
```

### Моки для JwtService

```typescript
const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id' }),
};

{
  provide: JwtService,
  useValue: mockJwtService,
}
```

## Покрытие кода

### Запуск с покрытием

```bash
npm run test:cov
```

### Настройка покрытия

Создайте файл `jest.config.js`:

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
  ],
};
```

## Структура тестов

```
test/
├── unit/                    # Unit тесты
│   ├── users.service.spec.ts
│   └── auth.service.spec.ts
├── integration/             # Integration тесты
│   ├── auth.integration.spec.ts
│   └── users.integration.spec.ts
└── e2e/                      # E2E тесты
    ├── auth.e2e-spec.ts
    └── users.e2e-spec.ts
```

## Best Practices

1. **Изоляция тестов**: Каждый тест должен быть независимым
2. **Очистка после тестов**: Используйте `afterEach` для очистки
3. **Именование**: Используйте описательные имена тестов
4. **AAA паттерн**: Arrange, Act, Assert
5. **Моки**: Мокайте внешние зависимости
6. **Покрытие**: Стремитесь к покрытию критичной логики
7. **Скорость**: Unit тесты должны быть быстрыми
8. **Читаемость**: Тесты должны быть понятными

## Пример полного теста сервиса

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test',
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(user.email);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const user = { id: '1', email: 'test@example.com', password: 'hashed' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

## Запуск тестов

```bash
# Все тесты
npm test

# Unit тесты
npm run test -- --testPathPattern=unit

# Integration тесты
npm run test -- --testPathPattern=integration

# E2E тесты
npm run test:e2e

# С покрытием
npm run test:cov

# В watch режиме
npm run test:watch
```

## Связанные документы

- [API_TESTING.md](./API_TESTING.md) - Тестирование через Postman
- [ADDING_FEATURES.md](../development/ADDING_FEATURES.md) - Гайд по внедрению фич
- [CODE_QUALITY.md](../development/CODE_QUALITY.md) - Чистота кода

