# Как писать тесты: Пошаговый гайд

Этот гайд объясняет алгоритм создания тестов на примере модуля `pregnancy`. Вы узнаете, как создавать unit и e2e тесты, какие подходы использовать и как структурировать код.

## Содержание

1. [Типы тестов](#типы-тестов)
2. [Алгоритм создания unit тестов](#алгоритм-создания-unit-тестов)
3. [Алгоритм создания e2e тестов](#алгоритм-создания-e2e-тестов)
4. [Пример: Тестирование PregnancyService](#пример-тестирование-pregnancyservice)
5. [Пример: E2E тесты для Pregnancy](#пример-e2e-тесты-для-pregnancy)
6. [Лучшие практики](#лучшие-практики)

---

## Типы тестов

### Unit тесты (Модульные тесты)
**Что тестируют:** Отдельные функции/методы в изоляции
**Где:** `src/**/*.spec.ts`
**Запуск:** `npm run test`

**Пример:** Тестирование метода `calculateCurrentDay()` в `PregnancyService`

### E2E тесты (End-to-End тесты)
**Что тестируют:** Полный поток работы API от HTTP запроса до ответа
**Где:** `test/**/*.e2e-spec.ts`
**Запуск:** `npm run test:e2e`

**Пример:** Тестирование эндпоинта `GET /v1/pregnancy/today`

---

## Алгоритм создания Unit тестов

### Шаг 1: Изучите код, который нужно тестировать

```typescript
// src/pregnancy/pregnancy.service.ts
calculateCurrentDay(startDate?: Date, dueDate?: Date): number {
  // Логика расчета текущего дня беременности
}
```

**Вопросы для анализа:**
- Какие входные параметры принимает метод?
- Какие граничные случаи (edge cases)?
- Какие ошибки могут возникнуть?
- Что метод возвращает?

### Шаг 2: Создайте файл теста

**Правило именования:** `{имя-файла}.spec.ts` рядом с исходным файлом

```
src/pregnancy/
  ├── pregnancy.service.ts      ← Исходный код
  └── pregnancy.service.spec.ts ← Тесты
```

### Шаг 3: Настройте тестовое окружение

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PregnancyService } from './pregnancy.service';

describe('PregnancyService', () => {
  let service: PregnancyService;

  beforeEach(async () => {
    // Создаем тестовый модуль
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PregnancyService,
        // Моки для зависимостей
      ],
    }).compile();

    service = module.get<PregnancyService>(PregnancyService);
  });

  afterEach(() => {
    // Очистка после каждого теста
    jest.clearAllMocks();
  });
});
```

### Шаг 4: Определите зависимости и создайте моки

**Анализ зависимостей:**

```typescript
// Исходный код
@Injectable()
export class PregnancyService {
  constructor(
    @InjectRepository(Pregnancy)
    private pregnancyRepository: Repository<Pregnancy>,
    @InjectRepository(PregnancyDay)
    private pregnancyDayRepository: Repository<PregnancyDay>,
    private cacheService: CacheService,
    private achievementsService: AchievementsService,
  ) {}
}
```

**Создание моков:**

```typescript
// Моки для репозиториев
const mockPregnancyRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockPregnancyDayRepository = {
  findOne: jest.fn(),
};

// Моки для сервисов
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

const mockAchievementsService = {
  checkAndUnlock: jest.fn(),
};
```

**Подключение моков:**

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    PregnancyService,
    {
      provide: getRepositoryToken(Pregnancy),
      useValue: mockPregnancyRepository,
    },
    {
      provide: getRepositoryToken(PregnancyDay),
      useValue: mockPregnancyDayRepository,
    },
    {
      provide: CacheService,
      useValue: mockCacheService,
    },
    {
      provide: AchievementsService,
      useValue: mockAchievementsService,
    },
  ],
}).compile();
```

### Шаг 5: Напишите тесты для каждого метода

**Структура теста:**

```typescript
describe('название метода', () => {
  it('должен делать что-то при определенных условиях', async () => {
    // 1. Arrange (Подготовка)
    // Настройка моков, создание тестовых данных
    
    // 2. Act (Действие)
    // Вызов тестируемого метода
    
    // 3. Assert (Проверка)
    // Проверка результата
  });
});
```

**Пример:**

```typescript
describe('calculateCurrentDay', () => {
  it('should calculate current day from startDate', () => {
    // Arrange (Подготовка)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10); // 10 дней назад

    // Act (Действие)
    const result = service.calculateCurrentDay(startDate);

    // Assert (Проверка)
    expect(result).toBe(11); // 10 дней + 1
  });
});
```

### Шаг 6: Покройте граничные случаи

```typescript
describe('calculateCurrentDay', () => {
  it('should calculate from startDate', () => { /* ... */ });
  
  it('should calculate from dueDate', () => { /* ... */ });
  
  it('should throw error if neither provided', () => {
    expect(() => service.calculateCurrentDay()).toThrow(
      'Either startDate or dueDate is required'
    );
  });
  
  it('should clamp day to 1 if negative', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const result = service.calculateCurrentDay(futureDate);
    expect(result).toBe(1);
  });
  
  it('should clamp day to 280 if exceeds', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 300);
    
    const result = service.calculateCurrentDay(oldDate);
    expect(result).toBe(280);
  });
});
```

### Шаг 7: Тестируйте взаимодействия с зависимостями

```typescript
describe('getTodayData', () => {
  it('should return cached data if available', async () => {
    // Arrange
    const userId = 'user-id';
    const cachedData = { day: 45, week: 7, /* ... */ };
    
    mockCacheService.get.mockResolvedValue(cachedData);

    // Act
    const result = await service.getTodayData(userId);

    // Assert
    expect(cacheService.get).toHaveBeenCalledWith(`pregnancy:today:${userId}`);
    expect(result).toEqual(cachedData);
    // Проверяем, что репозиторий НЕ вызывался
    expect(pregnancyRepository.findOne).not.toHaveBeenCalled();
  });

  it('should fetch fresh data if cache miss', async () => {
    // Arrange
    const userId = 'user-id';
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    
    const mockPregnancy = { id: 'preg-id', userId, startDate };
    const mockDayData = { day: 11, week: 2, /* ... */ };

    mockCacheService.get.mockResolvedValue(null);
    mockPregnancyRepository.findOne.mockResolvedValue(mockPregnancy);
    mockPregnancyDayRepository.findOne.mockResolvedValue(mockDayData);
    mockAchievementsService.checkAndUnlock.mockResolvedValue([]);

    // Act
    const result = await service.getTodayData(userId);

    // Assert
    expect(cacheService.get).toHaveBeenCalled();
    expect(pregnancyRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
    expect(pregnancyDayRepository.findOne).toHaveBeenCalled();
    expect(result).toHaveProperty('day', 11);
  });
});
```

---

## Алгоритм создания E2E тестов

### Шаг 1: Изучите API эндпоинт

```typescript
// src/pregnancy/pregnancy.controller.ts
@Get('today')
async getToday(@Request() req: { user: { id: string } }): Promise<TodayDataResponseDto> {
  return this.pregnancyService.getTodayData(req.user.id);
}
```

**Вопросы:**
- Какой HTTP метод?
- Какие параметры нужны?
- Нужна ли авторизация?
- Какие статус-коды возможны?

### Шаг 2: Создайте файл e2e теста

**Правило именования:** `{модуль}.e2e-spec.ts` в папке `test/`

```
test/
  └── pregnancy/
      └── pregnancy.e2e-spec.ts
```

### Шаг 3: Настройте тестовое приложение

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Pregnancy (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    // Создаем тестовый модуль с полным AppModule
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Настраиваем валидацию (как в main.ts)
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();

    // Регистрируем пользователя для тестов
    const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
      });

    if (registerResponse.status !== 201) {
      throw new Error(`Failed to register: ${JSON.stringify(registerResponse.body)}`);
    }

    accessToken = registerResponse.body.data.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });
});
```

### Шаг 4: Напишите тесты для каждого эндпоинта

**Структура e2e теста:**

```typescript
describe('GET /v1/pregnancy/today', () => {
  beforeEach(async () => {
    // Подготовка: настройка беременности
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    
    await request(app.getHttpServer())
      .post('/v1/pregnancy/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ start_date: startDate.toISOString().split('T')[0] });
  });

  it('should return today data', () => {
    return request(app.getHttpServer())
      .get('/v1/pregnancy/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        // Проверка структуры ответа
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('day');
        expect(res.body.data).toHaveProperty('week');
        expect(res.body.data).toHaveProperty('baby');
        expect(res.body.data).toHaveProperty('mother');
      });
  });

  it('should return 404 if pregnancy not set up', async () => {
    // Создаем нового пользователя без беременности
    const newUserResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `no-preg-${Date.now()}@example.com`,
        password: 'password123',
      });

    const newToken = newUserResponse.body.data.accessToken;

    return request(app.getHttpServer())
      .get('/v1/pregnancy/today')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(404);
  });

  it('should return 401 without token', () => {
    return request(app.getHttpServer())
      .get('/v1/pregnancy/today')
      .expect(401);
  });
});
```

### Шаг 5: Тестируйте валидацию

```typescript
describe('POST /v1/pregnancy/setup', () => {
  it('should return 400 if start_date is in future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return request(app.getHttpServer())
      .post('/v1/pregnancy/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ start_date: futureDateStr })
      .expect(400);
  });
});
```

---

## Пример: Тестирование PregnancyService

### Полный пример unit теста

```typescript
// src/pregnancy/pregnancy.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PregnancyService } from './pregnancy.service';
import { CacheService } from '../cache/cache.service';
import { AchievementsService } from '../achievements/achievements.service';
import { Pregnancy } from '../database/entities/pregnancy.entity';
import { PregnancyDay } from '../database/entities/pregnancy-day.entity';
import { PregnancyNotFoundError } from './exceptions/pregnancy-not-found.exception';

describe('PregnancyService', () => {
  let service: PregnancyService;
  let pregnancyRepository: Repository<Pregnancy>;
  let pregnancyDayRepository: Repository<PregnancyDay>;
  let cacheService: CacheService;

  // Шаг 1: Создаем моки для всех зависимостей
  const mockPregnancyRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPregnancyDayRepository = {
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockAchievementsService = {
    checkAndUnlock: jest.fn(),
  };

  // Шаг 2: Настраиваем тестовое окружение
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PregnancyService,
        {
          provide: getRepositoryToken(Pregnancy),
          useValue: mockPregnancyRepository,
        },
        {
          provide: getRepositoryToken(PregnancyDay),
          useValue: mockPregnancyDayRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AchievementsService,
          useValue: mockAchievementsService,
        },
      ],
    }).compile();

    service = module.get<PregnancyService>(PregnancyService);
    pregnancyRepository = module.get<Repository<Pregnancy>>(getRepositoryToken(Pregnancy));
    pregnancyDayRepository = module.get<Repository<PregnancyDay>>(
      getRepositoryToken(PregnancyDay),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Шаг 3: Тестируем каждый метод

  describe('calculateCurrentDay', () => {
    it('should calculate current day from startDate', () => {
      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10); // 10 дней назад

      // Act
      const result = service.calculateCurrentDay(startDate);

      // Assert
      expect(result).toBe(11); // 10 дней + 1
    });

    it('should calculate current day from dueDate', () => {
      // Arrange
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 270); // 270 дней в будущем

      // Act
      const result = service.calculateCurrentDay(undefined, dueDate);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(280);
    });

    it('should throw error if neither startDate nor dueDate provided', () => {
      // Act & Assert
      expect(() => service.calculateCurrentDay()).toThrow(
        'Either startDate or dueDate is required'
      );
    });

    it('should clamp day to 1 if negative', () => {
      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10); // в будущем

      // Act
      const result = service.calculateCurrentDay(startDate);

      // Assert
      expect(result).toBe(1);
    });

    it('should clamp day to 280 if exceeds', () => {
      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 300); // 300 дней назад

      // Act
      const result = service.calculateCurrentDay(startDate);

      // Assert
      expect(result).toBe(280);
    });
  });

  describe('getDayData', () => {
    it('should return day data', async () => {
      // Arrange
      const day = 45;
      const mockDayData = {
        id: 'day-id',
        day: 45,
        week: 7,
        trimester: 2,
        babySize: '15 cm',
        babyWeight: '200 g',
        babyDevelopment: 'Development text',
        motherChanges: 'Changes text',
        tips: ['tip1', 'tip2'],
      };

      mockPregnancyDayRepository.findOne.mockResolvedValue(mockDayData);

      // Act
      const result = await service.getDayData(day);

      // Assert
      expect(pregnancyDayRepository.findOne).toHaveBeenCalledWith({ where: { day } });
      expect(result).toEqual(mockDayData);
    });

    it('should throw NotFoundException if day data not found', async () => {
      // Arrange
      const day = 999;
      mockPregnancyDayRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getDayData(day)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTodayData', () => {
    it('should return cached data if available', async () => {
      // Arrange
      const userId = 'user-id';
      const cachedData = {
        day: 45,
        week: 7,
        trimester: 2,
        baby: { size: '15 cm', weight: '200 g', development: 'dev' },
        mother: { changes: 'changes' },
        tips: [],
        image_url: '/images/embryo/week-7.jpg',
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      // Act
      const result = await service.getTodayData(userId);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith(`pregnancy:today:${userId}`);
      expect(result).toEqual(cachedData);
      // Проверяем, что репозиторий НЕ вызывался (данные из кэша)
      expect(pregnancyRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch fresh data if cache miss', async () => {
      // Arrange
      const userId = 'user-id';
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

      const mockPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate,
        dueDate: undefined,
      };

      const mockDayData = {
        day: 11,
        week: 2,
        trimester: 1,
        babySize: '5 cm',
        babyWeight: '10 g',
        babyDevelopment: 'Development',
        motherChanges: 'Changes',
        tips: [],
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPregnancyRepository.findOne.mockResolvedValue(mockPregnancy);
      mockPregnancyDayRepository.findOne.mockResolvedValue(mockDayData);
      mockAchievementsService.checkAndUnlock.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.getTodayData(userId);

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(pregnancyRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(pregnancyDayRepository.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('day', 11);
      expect(result).toHaveProperty('image_url');
      expect(cacheService.set).toHaveBeenCalled(); // Проверяем кэширование
    });

    it('should throw PregnancyNotFoundError if pregnancy not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      mockCacheService.get.mockResolvedValue(null);
      mockPregnancyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTodayData(userId)).rejects.toThrow(PregnancyNotFoundError);
    });
  });
});
```

---

## Пример: E2E тесты для Pregnancy

### Полный пример e2e теста

```typescript
// test/pregnancy/pregnancy.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Pregnancy (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    // Шаг 1: Создаем тестовое приложение
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Шаг 2: Настраиваем валидацию
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();

    // Шаг 3: Регистрируем пользователя для тестов
    const uniqueEmail = `pregnancy-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Pregnancy Test User',
      });

    if (registerResponse.status !== 201 || !registerResponse.body.data?.accessToken) {
      throw new Error(`Failed to register: ${JSON.stringify(registerResponse.body)}`);
    }

    accessToken = registerResponse.body.data.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /v1/pregnancy/setup', () => {
    it('should setup pregnancy with start_date', () => {
      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Act & Assert
      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: startDateStr })
        .expect(200)
        .expect((res) => {
          // Проверяем структуру ответа
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('start_date', startDateStr);
          expect(res.body.data).toHaveProperty('current_day');
        });
    });

    it('should return 400 if start_date is in future', () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Act & Assert
      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: futureDateStr })
        .expect(400);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .send({ start_date: '2024-01-01' })
        .expect(401);
    });
  });

  describe('GET /v1/pregnancy/today', () => {
    beforeEach(async () => {
      // Подготовка: настраиваем беременность
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const startDateStr = startDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: startDateStr });
    });

    it('should return today data', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('day');
          expect(res.body.data).toHaveProperty('week');
          expect(res.body.data).toHaveProperty('trimester');
          expect(res.body.data).toHaveProperty('baby');
          expect(res.body.data).toHaveProperty('mother');
          expect(res.body.data).toHaveProperty('image_url');
        });
    });

    it('should return 404 if pregnancy not set up', async () => {
      // Создаем нового пользователя без беременности
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `no-pregnancy-${Date.now()}@example.com`,
          password: 'password123',
        });

      const newToken = newUserResponse.body.data.accessToken;

      return request(app.getHttpServer())
        .get('/v1/pregnancy/today')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(404);
    });
  });
});
```

---

## Лучшие практики

### 1. Структура теста (AAA Pattern)

```typescript
it('should do something', () => {
  // Arrange (Подготовка) - 30% кода
  const input = 'test';
  mockService.method.mockReturnValue('result');

  // Act (Действие) - 10% кода
  const result = service.method(input);

  // Assert (Проверка) - 60% кода
  expect(result).toBe('result');
  expect(mockService.method).toHaveBeenCalledWith(input);
});
```

### 2. Именование тестов

**Плохо:**
```typescript
it('test 1', () => {});
it('works', () => {});
```

**Хорошо:**
```typescript
it('should return 404 if pregnancy not found', () => {});
it('should calculate current day from startDate', () => {});
it('should throw error if startDate is in future', () => {});
```

**Формат:** `should {ожидаемое поведение} when {условие}`

### 3. Один тест = одна проверка

**Плохо:**
```typescript
it('should do everything', () => {
  expect(service.method1()).toBe('result1');
  expect(service.method2()).toBe('result2');
  expect(service.method3()).toBe('result3');
});
```

**Хорошо:**
```typescript
it('should return result1', () => {
  expect(service.method1()).toBe('result1');
});

it('should return result2', () => {
  expect(service.method2()).toBe('result2');
});
```

### 4. Тестируйте граничные случаи

```typescript
describe('calculateCurrentDay', () => {
  it('should work with normal date', () => { /* ... */ });
  it('should handle future date', () => { /* ... */ });
  it('should handle very old date', () => { /* ... */ });
  it('should handle null/undefined', () => { /* ... */ });
  it('should handle edge values (1, 280)', () => { /* ... */ });
});
```

### 5. Используйте уникальные данные в e2e тестах

**Плохо:**
```typescript
email: 'test@example.com' // Конфликты между тестами
```

**Хорошо:**
```typescript
email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
```

### 6. Проверяйте взаимодействия с зависимостями

```typescript
it('should call cache service', async () => {
  await service.getTodayData('user-id');
  
  expect(cacheService.get).toHaveBeenCalledWith('pregnancy:today:user-id');
  expect(cacheService.get).toHaveBeenCalledTimes(1);
});
```

### 7. Очищайте моки после тестов

```typescript
afterEach(() => {
  jest.clearAllMocks(); // Очищает вызовы и возвращаемые значения
});
```

### 8. Группируйте связанные тесты

```typescript
describe('PregnancyService', () => {
  describe('calculateCurrentDay', () => {
    // Все тесты для calculateCurrentDay
  });
  
  describe('getTodayData', () => {
    // Все тесты для getTodayData
  });
});
```

---

## Чек-лист создания тестов

### Unit тесты
- [ ] Создан файл `*.spec.ts` рядом с исходным файлом
- [ ] Настроены моки для всех зависимостей
- [ ] Тестируется каждый публичный метод
- [ ] Покрыты граничные случаи
- [ ] Проверяются взаимодействия с зависимостями
- [ ] Тесты изолированы (не зависят друг от друга)

### E2E тесты
- [ ] Создан файл `*.e2e-spec.ts` в папке `test/`
- [ ] Настроено тестовое приложение с ValidationPipe
- [ ] Реализована авторизация (если нужно)
- [ ] Тестируются все эндпоинты
- [ ] Проверяются успешные сценарии (200, 201)
- [ ] Проверяются ошибки (400, 401, 404, 409)
- [ ] Используются уникальные данные

---

## Полезные команды

```bash
# Запуск всех unit тестов
npm run test

# Запуск unit тестов в watch режиме
npm run test:watch

# Запуск с покрытием кода
npm run test:cov

# Запуск e2e тестов
npm run test:e2e

# Запуск конкретного теста
npm run test -- pregnancy.service.spec.ts
```

---

## Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

---

**Помните:** Хорошие тесты - это инвестиция в будущее. Они помогают находить баги до продакшена и дают уверенность при рефакторинге кода.

