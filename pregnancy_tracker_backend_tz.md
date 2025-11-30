# Техническое задание: Трекер беременности - Backend

## Назначение документа

Этот документ описывает детальное техническое задание для реализации backend части фичи "Трекер беременности по дням". Документ содержит декомпозированные задачи, API спецификации, схемы базы данных и требования к реализации.

**Версия**: 1.0  
**Дата создания**: 2024  
**Статус**: Готов к реализации MVP  
**Связанный документ**: [SPEC.md](../../mvp/pregnancy_tracker/SPEC.md)

---

## Обзор задач

### Модули для реализации

1. **API Endpoints** - REST API для трекера беременности
2. **Pregnancy Service** - Бизнес-логика работы с данными беременности
3. ⏸️ **Calendar Service** - Управление календарем событий (ОТЛОЖЕНО - будет реализовано из другого проекта)
4. **Achievements Service** - Система достижений
5. **Database Migrations** - Миграции для новых таблиц
6. **Caching Layer** - Кэширование данных
7. **Validation** - Валидация входных данных

---

## Задача 1: API Endpoints

### 1.1. Получение данных на текущий день

**Endpoint**: `GET /v1/pregnancy/today`

**Описание**: Возвращает данные о беременности на текущий день для авторизованного пользователя. Включает проверку достижений.

**Требования**:
- Требуется JWT аутентификация
- Автоматический расчет текущего дня на основе `start_date` из таблицы `pregnancies`
- Проверка достижений при каждом запросе
- Кэширование ответа в Redis (TTL: 1 час)

**Request**:
```
GET /v1/pregnancy/today
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "day": 45,
    "week": 6,
    "trimester": 1,
    "baby": {
      "size": "4-5 мм",
      "weight": "0.5 г",
      "development": "Формируются зачатки рук и ног, начинает биться сердце. Развиваются основные органы, включая сердце, мозг и конечности. Начинается формирование плаценты."
    },
    "mother": {
      "changes": "Возможны утренняя тошнота, усталость, изменения настроения"
    },
    "tips": [
      "Пейте больше воды",
      "Отдыхайте при усталости"
    ],
    "image_url": "/images/embryo/week-6.jpg",
    "new_achievements": [
      {
        "id": "uuid",
        "type": "milestone",
        "key": "week_6",
        "title": "Первые недели",
        "description": "Вы достигли 6 недель беременности",
        "unlocked_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Response (404 Not Found)** - если данные о беременности не найдены:
```json
{
  "success": false,
  "error": {
    "code": "PREGNANCY_NOT_FOUND",
    "message": "Pregnancy data not found. Please set up your pregnancy first."
  }
}
```

**Реализация**:
- Controller: `pregnancyController.getToday`
- Service: `pregnancyService.getTodayData(userId)`
- Проверка достижений: `achievementsService.checkAndUnlock(userId, day, week)`

---

### 1.2. Получение данных на конкретный день

**Endpoint**: `GET /v1/pregnancy/day/:day`

**Описание**: Возвращает данные о беременности на указанный день (1-280).

**Требования**:
- Валидация параметра `day` (1-280) и то чтобы будущие дни не показывать
- Требуется JWT аутентификация

**Request**:
```
GET /v1/pregnancy/day/45
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "day": 45,
    "week": 6,
    "trimester": 1,
    "baby": { ... },
    "mother": { ... },
    "tips": [ ... ],
    "image_url": "/images/embryo/week-6.jpg"
  }
}
```

**Response (400 Bad Request)** - невалидный день:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Day must be between 1 and 280",
    "details": {
      "day": "Day must be between 1 and 280"
    }
  }
}
```

---

### 1.3. Настройка беременности

**Endpoint**: `POST /v1/pregnancy/setup`

**Описание**: Создает или обновляет данные о беременности пользователя. Автоматически создает события календаря при первой настройке. совмещен с экраном регистрации (экран регистрации покажется после 1 заполнения после просмотра 3 секунд на результат)

**Требования**:
- Валидация дат (формат, диапазон)
- Расчет `current_day` на основе `start_date` или `due_date`
- Автоматическое создание событий календаря только при первой настройке
- Если `pregnancy` уже существует - обновление данных

**Request**:
```json
{
  "start_date": "2024-01-01",
  "due_date": "2024-10-08"
}
```

Или:
```json
{
  "due_date": "2024-10-08"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "start_date": "2024-01-01",
    "due_date": "2024-10-08",
    "current_day": 45,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Валидация**:
- `start_date` или `due_date` обязательны
- Формат даты: `YYYY-MM-DD`
- `start_date` не может быть в будущем
- `due_date` должен быть после `start_date`
- Срок беременности не должен превышать 42 недели (294 дня)

---

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

### 1.4. Получение календаря событий

**Endpoint**: `GET /v1/pregnancy/calendar`

**Описание**: Возвращает события календаря с пагинацией по месяцам.

**Требования**:
- Пагинация по месяцам (параметры `start`, `end`, `page`, `limit`)
- Фильтрация по типу события (опционально)
- Кэширование в Redis (TTL: 1 час)

**Request**:
```
GET /v1/pregnancy/calendar?start=2024-01-01&end=2024-12-31&page=1&limit=30
Authorization: Bearer <token>
```

**Query Parameters**:
- `start` (required) - начальная дата (YYYY-MM-DD)
- `end` (required) - конечная дата (YYYY-MM-DD)
- `page` (optional, default: 1) - номер страницы
- `limit` (optional, default: 30) - количество событий на странице
- `type` (optional) - фильтр по типу: `automatic` | `personal`
- `category` (optional) - фильтр по категории: `medical` | `milestone` | `personal`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "type": "automatic",
        "category": "medical",
        "title": "Первое УЗИ",
        "date": "2024-02-15",
        "time": "10:00",
        "description": "Плановое первое УЗИ для оценки развития плода",
        "editable": true,
        "exported_to_calendar": false,
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 30,
      "total": 45,
      "totalPages": 2
    }
  }
}
```

---

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

### 1.5. Создание личного события

**Endpoint**: `POST /v1/pregnancy/calendar/events`

**Описание**: Создает новое личное событие в календаре.

**Требования**:
- Валидация обязательных полей
- Проверка даты (не в прошлом для будущих событий)

**Request**:
```json
{
  "title": "Покупка кроватки",
  "date": "2024-03-20",
  "time": "14:00",
  "description": "Выбрать и купить детскую кроватку",
  "reminder": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "personal",
    "category": "personal",
    "title": "Покупка кроватки",
    "date": "2024-03-20",
    "time": "14:00",
    "description": "Выбрать и купить детскую кроватку",
    "reminder": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Валидация**:
- `title` (required, string, max 255 символов)
- `date` (required, format: YYYY-MM-DD)
- `time` (optional, format: HH:mm)
- `description` (optional, text)
- `reminder` (optional, boolean)

---

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

### 1.6. Обновление события

**Endpoint**: `PUT /v1/pregnancy/calendar/events/:id`

**Описание**: Обновляет существующее событие календаря.

**Требования**:
- Проверка прав доступа (событие принадлежит пользователю)
- Валидация обновляемых полей

**Request**:
```json
{
  "date": "2024-03-21",
  "time": "15:00",
  "title": "Покупка кроватки и матраса"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    ...updated event data
  }
}
```

**Response (404 Not Found)** - событие не найдено:
```json
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Event not found"
  }
}
```

---

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

### 1.7. Удаление события

**Endpoint**: `DELETE /v1/pregnancy/calendar/events/:id`

**Описание**: Удаляет событие календаря.

**Требования**:
- Проверка прав доступа
- Мягкое удаление или полное удаление (на усмотрение)

**Request**:
```
DELETE /v1/pregnancy/calendar/events/uuid
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true
}
```

---

### 1.8. Получение достижений

**Endpoint**: `GET /v1/pregnancy/achievements`

**Описание**: Возвращает список всех достижений пользователя (полученные и заблокированные).

**Требования**:
- Кэширование в Redis (TTL: 30 минут)

**Request**:
```
GET /v1/pregnancy/achievements
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "unlocked": [
      {
        "id": "uuid",
        "type": "milestone",
        "key": "week_12",
        "title": "Первый триместр пройден!",
        "description": "Вы завершили первый триместр беременности",
        "icon": "badge_triangle_1",
        "unlocked_at": "2024-01-15T10:30:00Z"
      }
    ],
    "locked": [
      {
        "type": "milestone",
        "key": "week_20",
        "title": "Половина пути",
        "description": "Достигните 20 недель беременности",
        "progress": 0.6,
        "days_remaining": 95
      }
    ],
    "total_unlocked": 3,
    "total_available": 10
  }
}
```

---

## Задача 2: Pregnancy Service

### 2.1. Расчет текущего дня беременности

**Метод**: `calculateCurrentDay(startDate: Date, dueDate?: Date): number`

**Описание**: Вычисляет текущий день беременности на основе даты начала или предполагаемой даты родов.

**Логика**:
- Если передан `startDate`: `currentDay = (сегодня - startDate) + 1`
- Если передан только `dueDate`: `startDate = dueDate - 280 дней`, затем расчет
- Валидация: день должен быть в диапазоне 1-280

**Пример**:
```typescript
// startDate = 2024-01-01, сегодня = 2024-02-15
// currentDay = (2024-02-15 - 2024-01-01) + 1 = 46 дней
```

---

### 2.2. Получение данных дня из БД

**Метод**: `getDayData(day: number): Promise<PregnancyDay>`

**Описание**: Получает данные о дне беременности из таблицы `pregnancy_days`.

**Требования**:
- Запрос к таблице `pregnancy_days` по полю `day`
- Обработка случая, когда данные не найдены

**Структура данных**:
```typescript
interface PregnancyDay {
  id: string;
  day: number;
  week: number;
  trimester: number;
  mother_changes: string;
  baby_development: string;
  baby_size: string;
  baby_weight: string;
  tips: string[];
}
```

---

### 2.3. Формирование URL изображения

**Метод**: `getImageUrl(week: number): string`

**Описание**: Формирует URL статического изображения эмбриона/плода по неделе.

**Логика**:
- Формат: `/images/embryo/week-{week}.jpg`
- Пример: для 6 недели → `/images/embryo/week-6.jpg`

---

### 2.4. Получение данных на текущий день

**Метод**: `getTodayData(userId: string): Promise<TodayData>`

**Описание**: Основной метод для получения данных на текущий день.

**Алгоритм**:
1. Получить `pregnancy` для пользователя
2. Рассчитать `currentDay`
3. Получить данные дня из `pregnancy_days`
4. Сформировать `image_url`
5. Проверить достижения (через `achievementsService`)
6. Вернуть объединенные данные

**Кэширование**:
- Ключ: `pregnancy:today:{userId}`
- TTL: 1 час
- Инвалидация при обновлении беременности

---

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

## Задача 3: Calendar Service

### 3.1. Автоматическое создание событий

**Метод**: `createAutomaticEvents(pregnancyId: string, startDate: Date): Promise<void>`

**Описание**: Создает автоматические события календаря при первой настройке беременности.

**События для создания**:

1. **Первое УЗИ** (12 недель):
   - `date = startDate + 84 дня`
   - `category = "medical"`
   - `title = "Первое УЗИ"`

2. **Второе УЗИ** (20 недель):
   - `date = startDate + 140 дней`
   - `category = "medical"`
   - `title = "Второе УЗИ"`

3. **Третий скрининг** (32 недели):
   - `date = startDate + 224 дня`
   - `category = "medical"`
   - `title = "Третий скрининг"`

4. **Анализы крови** (8, 16, 30 недель):
   - Создать 3 события с соответствующими датами

5. **Визиты к врачу**:
   - Ежемесячно до 28 недель
   - Каждые 2 недели с 28 до 36 недель
   - Еженедельно с 36 недель

6. **Вехи триместров**:
   - Завершение первого триместра (12 недель)
   - Завершение второго триместра (27 недель)
   - Завершение третьего триместра (40 недель)

**Требования**:
- Создавать события только один раз при первой настройке
- Не пересчитывать при изменении даты начала беременности

---

### 3.2. Получение событий с пагинацией

**Метод**: `getEvents(userId: string, filters: CalendarFilters, pagination: Pagination): Promise<PaginatedEvents>`

**Описание**: Получает события календаря с фильтрацией и пагинацией.

**Фильтры**:
- `start` (Date) - начальная дата
- `end` (Date) - конечная дата
- `type` (optional) - `automatic` | `personal`
- `category` (optional) - `medical` | `milestone` | `personal`

**Пагинация**:
- `page` (number, default: 1)
- `limit` (number, default: 30)

**Кэширование**:
- Ключ: `pregnancy:calendar:{userId}:{start}:{end}:{page}`
- TTL: 1 час

---

### 3.3. Создание личного события

**Метод**: `createPersonalEvent(userId: string, eventData: CreateEventInput): Promise<CalendarEvent>`

**Описание**: Создает новое личное событие.

**Валидация**:
- `title` обязателен, max 255 символов
- `date` обязателен, формат YYYY-MM-DD
- `time` опционален, формат HH:mm

---

### 3.4. Обновление события

**Метод**: `updateEvent(userId: string, eventId: string, updates: UpdateEventInput): Promise<CalendarEvent>`

**Описание**: Обновляет существующее событие.

**Требования**:
- Проверка прав доступа (событие принадлежит пользователю через `pregnancy_id`)
- Валидация обновляемых полей

---

### 3.5. Удаление события

**Метод**: `deleteEvent(userId: string, eventId: string): Promise<void>`

**Описание**: Удаляет событие календаря.

**Требования**:
- Проверка прав доступа
- Полное удаление из БД

---

## Задача 4: Achievements Service

### 4.1. Определение достижений

**Конфигурация достижений**:

```typescript
const ACHIEVEMENTS = [
  { key: 'week_4', type: 'milestone', week: 4, title: 'Первые недели' },
  { key: 'week_8', type: 'milestone', week: 8, title: 'Первый месяц' },
  { key: 'week_12', type: 'milestone', week: 12, title: 'Первый триместр' },
  { key: 'week_16', type: 'milestone', week: 16, title: '16 недель' },
  { key: 'week_20', type: 'milestone', week: 20, title: 'Половина пути' },
  { key: 'week_24', type: 'milestone', week: 24, title: '24 недели' },
  { key: 'week_28', type: 'milestone', week: 28, title: 'Третий триместр' },
  { key: 'week_32', type: 'milestone', week: 32, title: '32 недели' },
  { key: 'week_36', type: 'milestone', week: 36, title: 'Финишная прямая' },
  { key: 'week_40', type: 'milestone', week: 40, title: 'До встречи!' },
  { key: 'day_100', type: 'special', day: 100, title: '100 дней беременности' },
  { key: 'day_200', type: 'special', day: 200, title: '200 дней беременности' },
];
```

---

### 4.2. Проверка и разблокировка достижений

**Метод**: `checkAndUnlock(userId: string, day: number, week: number): Promise<Achievement[]>`

**Описание**: Проверяет достижения для текущего дня и разблокирует новые.

**Алгоритм**:
1. Получить все достижения пользователя из БД
2. Для каждого достижения из конфигурации:
   - Проверить, не разблокировано ли уже
   - Проверить условие (week или day)
   - Если условие выполнено и не разблокировано - создать запись в БД
3. Вернуть список новых достижений

**Требования**:
- Проверка выполняется синхронно при запросе `/pregnancy/today`
- Атомарность операций (транзакция)

---

### 4.3. Получение всех достижений

**Метод**: `getAllAchievements(userId: string): Promise<AchievementsResponse>`

**Описание**: Возвращает все достижения (разблокированные и заблокированные).

**Структура ответа**:
```typescript
interface AchievementsResponse {
  unlocked: Achievement[];
  locked: LockedAchievement[];
  total_unlocked: number;
  total_available: number;
}
```

**Кэширование**:
- Ключ: `pregnancy:achievements:{userId}`
- TTL: 30 минут

---

## Задача 5: Database Migrations

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

### 5.1. Таблица pregnancy_calendar_events

**Миграция**: `CreatePregnancyCalendarEventsTable`

**SQL**:
```sql
CREATE TABLE pregnancy_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('automatic', 'personal')),
  category VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  description TEXT,
  reminder BOOLEAN DEFAULT false,
  reminder_time TIMESTAMP,
  exported_to_calendar BOOLEAN DEFAULT false,
  calendar_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_pregnancy_date 
  ON pregnancy_calendar_events(pregnancy_id, date);

CREATE INDEX idx_calendar_events_date 
  ON pregnancy_calendar_events(date);

CREATE INDEX idx_calendar_events_type 
  ON pregnancy_calendar_events(type);
```

---

### 5.2. Обновление таблицы pregnancy_days

**Добавление поля** (если отсутствует):
```sql
ALTER TABLE pregnancy_days 
ADD COLUMN IF NOT EXISTS image_week INTEGER;
```

**Примечание**: Поле `image_week` может использоваться для связи с изображениями, но для MVP достаточно использовать расчет недели из поля `week`.

---

### 5.3. Обновление таблицы achievements

**Проверка структуры** (должна существовать):
```sql
-- Таблица уже должна существовать согласно DATABASE_SCHEMA.md
-- Проверить наличие индексов:
CREATE INDEX IF NOT EXISTS idx_achievements_user_type 
  ON achievements(user_id, achievement_type, achievement_key);
```

---

## Задача 6: Caching Layer

### 6.1. Кэширование данных на сегодня

**Ключ**: `pregnancy:today:{userId}`

**TTL**: 1 час (3600 секунд)

**Инвалидация**:
- При обновлении данных беременности
- При изменении текущего дня (автоматически по TTL)

**Реализация**:
```typescript
async getTodayData(userId: string) {
  const cacheKey = `pregnancy:today:${userId}`;
  
  // Проверка кэша
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Получение данных
  const data = await this.fetchTodayData(userId);
  
  // Кэширование
  await cacheService.set(cacheKey, data, 3600);
  
  return data;
}
```

---

⏸️ **ОТЛОЖЕНО - будет реализовано из другого проекта**

### 6.2. Кэширование календаря

**Ключ**: `pregnancy:calendar:{userId}:{start}:{end}:{page}`

**TTL**: 1 час (3600 секунд)

**Инвалидация**:
- При создании/обновлении/удалении события
- По TTL

---

### 6.3. Кэширование достижений

**Ключ**: `pregnancy:achievements:{userId}`

**TTL**: 30 минут (1800 секунд)

**Инвалидация**:
- При разблокировке нового достижения
- По TTL

---

## Задача 7: Validation

### 7.1. Валидация настройки беременности

**Схема валидации** (zod):
```typescript
const setupPregnancySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => data.start_date || data.due_date,
  { message: "Either start_date or due_date is required" }
);
```

**Дополнительная валидация**:
- `start_date` не может быть в будущем
- `due_date` должен быть после `start_date` (если оба указаны)
- Срок беременности не должен превышать 42 недели (294 дня)

---

### 7.2. Валидация создания события

**Схема валидации**:
```typescript
const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  description: z.string().optional(),
  reminder: z.boolean().optional(),
});
```

---

### 7.3. Валидация параметра day

**Схема валидации**:
```typescript
const dayParamSchema = z.object({
  day: z.string().regex(/^\d+$/).transform(Number).refine(
    (n) => n >= 1 && n <= 280,
    { message: "Day must be between 1 and 280" }
  ),
});
```

---

## Задача 8: Обработка ошибок

### 8.1. Кастомные ошибки

**Классы ошибок**:
```typescript
export class PregnancyNotFoundError extends AppError {
  constructor() {
    super('PREGNANCY_NOT_FOUND', 'Pregnancy data not found', 404);
  }
}

export class EventNotFoundError extends AppError {
  constructor() {
    super('EVENT_NOT_FOUND', 'Event not found', 404);
  }
}

export class UnauthorizedEventAccessError extends AppError {
  constructor() {
    super('UNAUTHORIZED_EVENT_ACCESS', 'You do not have access to this event', 403);
  }
}
```

---

### 8.2. Обработка в middleware

**Error middleware** должен обрабатывать:
- `PregnancyNotFoundError` → 404
- `EventNotFoundError` → 404
- `UnauthorizedEventAccessError` → 403
- `ValidationError` → 400 с деталями

---

## Задача 9: Тестирование

### 9.1. Unit тесты

**Покрытие**:
- `PregnancyService` - расчет дней, получение данных
- `CalendarService` - создание событий, пагинация
- `AchievementsService` - проверка достижений
- Валидация

---

### 9.2. Integration тесты

**Покрытие**:
- API endpoints
- Работа с БД
- Кэширование

---

### 9.3. E2E тесты

**Сценарии**:
- Настройка беременности → получение данных на сегодня
- Создание события → получение календаря
- Достижение вехи → получение достижения

---

## Приоритеты реализации

### MVP Phase 1 (Критично)
1. ✅ API Endpoints (1.1, 1.2, 1.3, 1.8) - ⏸️ 1.4, 1.5, 1.6, 1.7 отложены
2. ✅ Pregnancy Service (2.1, 2.2, 2.3, 2.4)
3. ⏸️ Calendar Service (3.1, 3.2, 3.3, 3.4, 3.5) - ОТЛОЖЕНО
4. ✅ Achievements Service (4.1, 4.2, 4.3)
5. ✅ Database Migrations (5.2, 5.3) - ⏸️ 5.1 отложена
6. ✅ Caching Layer (6.1, 6.3) - ⏸️ 6.2 отложено
7. ✅ Validation (7.1, 7.2, 7.3)
8. ✅ Обработка ошибок (8.1, 8.2)

### MVP Phase 2 (Важно)
9. ✅ Тестирование (9.1, 9.2, 9.3)

---

## Связанные документы

- [SPEC.md](../../mvp/pregnancy_tracker/SPEC.md) - Спецификация фичи
- [BACKEND_ARCHITECTURE.md](../architecture/BACKEND_ARCHITECTURE.md) - Архитектура backend
- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - Схема базы данных
- [API_DESIGN.md](../api/API_DESIGN.md) - Дизайн API

---

**Версия документа**: 1.0  
**Дата последнего обновления**: 2024  
**Статус**: Готов к реализации MVP

