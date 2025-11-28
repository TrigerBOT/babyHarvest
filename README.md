# NestJS REST API Template

Production-ready шаблон для создания REST API бэкендов на NestJS.

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- PostgreSQL 15+
- npm или yarn

### Установка

1. **Клонируйте репозиторий**
   ```bash
   git clone <repository-url>
   cd nestjs-rest-api-template
   ```

2. **Установите зависимости**
   ```bash
   npm install
   ```

3. **Настройте переменные окружения**
   ```bash
   cp env.example .env
   ```
   
   Отредактируйте `.env` файл:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key"
   ```

4. **Настройте базу данных**
   ```bash
   # Применение миграций
   npm run migration:run
   ```

5. **Запустите приложение**
   ```bash
   # Режим разработки
   npm run start:dev
   
   # Или продакшн режим
   npm run build
   npm run start:prod
   ```

## 📚 Документация

### API Документация

После запуска приложения документация API доступна по адресу:
- **Swagger UI**: http://localhost:3000/docs
- **JSON Schema**: http://localhost:3000/docs-json

### Полная документация проекта

Подробная документация по архитектуре, разработке и тестированию доступна в директории `docs/`:

- **[📖 Документация проекта](./docs/README.md)** - Полный индекс документации
- **[🏗️ Архитектура](./docs/architecture/ARCHITECTURE.md)** - Общая архитектура приложения
- **[📦 Структура модулей](./docs/architecture/MODULE_STRUCTURE.md)** - Детальная структура модулей
- **[🎮 Добавление контроллеров](./docs/development/ADDING_CONTROLLERS.md)** - Гайд по созданию контроллеров
- **[✨ Внедрение фич](./docs/development/ADDING_FEATURES.md)** - Гайд по созданию новых модулей
- **[💎 Качество кода](./docs/development/CODE_QUALITY.md)** - Best practices и типизация
- **[🧪 Тестирование](./docs/testing/TESTING_GUIDE.md)** - Гайд по написанию тестов
- **[🔌 Тестирование API](./docs/testing/API_TESTING.md)** - Тестирование через Postman и альтернативы

## 🔐 Авторизация

### Регистрация
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Вход в систему
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Получение информации о пользователе
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🧪 Тестирование

### Запуск тестов
```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие кода
npm run test:cov
```

### Тестирование API

Для быстрого тестирования API можно использовать Postman:

```bash
# Генерация Postman коллекции из Swagger
npm run postman:generate

# Генерация для локального сервера
npm run postman:generate:local
```

Подробнее о тестировании API: [API_TESTING.md](./docs/testing/API_TESTING.md)

## 🏗️ Архитектура

### Структура проекта
```
src/
├── auth/                 # Модуль авторизации
│   ├── dto/             # Data Transfer Objects
│   ├── guards/          # Guards для защиты роутов
│   ├── strategies/      # Passport стратегии
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/               # Управление пользователями
├── common/              # Общие утилиты
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
├── database/            # Модуль базы данных
│   ├── entities/       # TypeORM сущности
│   └── database.module.ts
└── app.module.ts        # Главный модуль
```

### Технологический стек
- **NestJS** - Node.js фреймворк
- **PostgreSQL** - База данных
- **TypeORM** - ORM
- **JWT** - Аутентификация
- **bcrypt** - Хеширование паролей
- **Swagger** - Документация API
- **Docker** - Контейнеризация

## 🔧 Разработка

### Полезные команды
```bash
# Генерация миграции
npm run migration:generate -- -n MigrationName

# Применение миграций
npm run migration:run

# Откат миграции
npm run migration:revert

# Генерация Postman коллекции
npm run postman:generate

# Линтинг кода
npm run lint

# Форматирование кода
npm run format
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DATABASE_URL` | URL подключения к БД | - |
| `JWT_SECRET` | Секретный ключ для JWT | - |
| `JWT_EXPIRES_IN` | Время жизни access токена | `1h` |
| `JWT_REFRESH_SECRET` | Секретный ключ для refresh токена | - |
| `JWT_REFRESH_EXPIRES_IN` | Время жизни refresh токена | `7d` |
| `BCRYPT_ROUNDS` | Количество раундов хеширования | `12` |
| `RATE_LIMIT_TTL` | TTL для rate limiting (сек) | `60` |
| `RATE_LIMIT_LIMIT` | Лимит запросов | `100` |

## 🚀 Деплой

### Docker
```bash
# Сборка образа
docker build -t nestjs-rest-api .

# Запуск с Docker Compose
docker-compose up -d
```

### Продакшн
1. Настройте переменные окружения
2. Соберите приложение: `npm run build`
3. Запустите: `npm run start:prod`

## 📝 API Endpoints

### Авторизация
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /auth/refresh` - Обновление токена
- `GET /auth/me` - Текущий пользователь
- `POST /auth/logout` - Выход
- `POST /auth/forgot-password` - Запрос сброса пароля
- `POST /auth/reset-password` - Сброс пароля

### Пользователи
- `GET /users/profile` - Профиль пользователя
- `PUT /users/profile` - Обновление профиля
- `DELETE /users/account` - Удаление аккаунта

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License

## 🆘 Поддержка

Если у вас возникли вопросы или проблемы:
1. Проверьте документацию API
2. Посмотрите существующие Issues
3. Создайте новый Issue с подробным описанием

---

**NestJS REST API Template** - Готовый шаблон для быстрого старта разработки REST API 🚀
