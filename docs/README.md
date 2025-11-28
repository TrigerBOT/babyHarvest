# Документация NestJS REST API шаблона

Добро пожаловать в документацию NestJS REST API шаблона. Эта документация поможет вам понять архитектуру проекта, научиться добавлять новые функции, писать тесты и поддерживать качество кода.

## 📚 Структура документации

### 🏗️ Архитектура

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - Общее описание архитектуры NestJS приложения
  - Модульная архитектура
  - Слои приложения
  - Dependency Injection
  - Паттерны проектирования
  - Безопасность и конфигурация

- **[MODULE_STRUCTURE.md](./architecture/MODULE_STRUCTURE.md)** - Детальная структура модулей
  - Структура модуля
  - Компоненты модуля (Controller, Service, DTO, Guards, Strategies)
  - Примеры из проекта
  - Принципы организации

### 💻 Разработка

- **[ADDING_CONTROLLERS.md](./development/ADDING_CONTROLLERS.md)** - Гайд по добавлению контроллеров
  - Структура контроллера
  - Использование декораторов
  - Валидация через DTO
  - Swagger документация
  - Защита роутов
  - Примеры CRUD контроллеров

- **[ADDING_FEATURES.md](./development/ADDING_FEATURES.md)** - Гайд по внедрению новых фич
  - Создание нового модуля с нуля
  - Работа с базой данных (Entities, Migrations)
  - Интеграция с существующими модулями
  - Полный пример: модуль Transactions
  - Чек-лист при добавлении фичи

- **[CODE_QUALITY.md](./development/CODE_QUALITY.md)** - Чистота кода и типизация
  - TypeScript best practices
  - Использование типов и интерфейсов
  - Обработка ошибок
  - Валидация данных
  - Линтинг и форматирование
  - Примеры хорошего и плохого кода

### 🧪 Тестирование

- **[TESTING_GUIDE.md](./testing/TESTING_GUIDE.md)** - Полный гайд по тестированию
  - Unit тесты (сервисы, утилиты)
  - Integration тесты (модули, база данных)
  - E2E тесты (API endpoints)
  - Моки и стабы
  - Покрытие кода
  - Примеры тестов для каждого типа

- **[API_TESTING.md](./testing/API_TESTING.md)** - Тестирование через Postman и альтернативы
  - Автоматическая генерация коллекции из Swagger
  - Настройка Postman коллекции
  - Автоматизация тестов в Postman
  - Альтернативы: Insomnia, REST Client, curl, httpie
  - Скрипты для быстрого тестирования

## 🚀 Быстрый старт

### 1. Изучите архитектуру

Начните с понимания общей архитектуры проекта:
- [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) - Общая архитектура
- [MODULE_STRUCTURE.md](./architecture/MODULE_STRUCTURE.md) - Структура модулей

### 2. Научитесь добавлять контроллеры

Когда поймете архитектуру, изучите как добавлять новые контроллеры:
- [ADDING_CONTROLLERS.md](./development/ADDING_CONTROLLERS.md) - Гайд по контроллерам

### 3. Научитесь добавлять новые фичи

Изучите процесс создания новых модулей и фич:
- [ADDING_FEATURES.md](./development/ADDING_FEATURES.md) - Гайд по внедрению фич

### 4. Поддерживайте качество кода

Изучите best practices для написания чистого кода:
- [CODE_QUALITY.md](./development/CODE_QUALITY.md) - Чистота кода

### 5. Научитесь тестировать

Изучите различные типы тестов и как их писать:
- [TESTING_GUIDE.md](./testing/TESTING_GUIDE.md) - Гайд по тестированию
- [API_TESTING.md](./testing/API_TESTING.md) - Тестирование API

## 📖 Рекомендуемый порядок изучения

### Для новичков в NestJS:

1. [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) - Понять общую архитектуру
2. [MODULE_STRUCTURE.md](./architecture/MODULE_STRUCTURE.md) - Изучить структуру модулей
3. [ADDING_CONTROLLERS.md](./development/ADDING_CONTROLLERS.md) - Научиться создавать контроллеры
4. [ADDING_FEATURES.md](./development/ADDING_FEATURES.md) - Создать первый модуль
5. [CODE_QUALITY.md](./development/CODE_QUALITY.md) - Изучить best practices
6. [TESTING_GUIDE.md](./testing/TESTING_GUIDE.md) - Научиться писать тесты
7. [API_TESTING.md](./testing/API_TESTING.md) - Настроить тестирование API

### Для опытных разработчиков:

1. [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) - Быстрый обзор архитектуры
2. [ADDING_FEATURES.md](./development/ADDING_FEATURES.md) - Создать новый модуль
3. [TESTING_GUIDE.md](./testing/TESTING_GUIDE.md) - Написать тесты
4. [API_TESTING.md](./testing/API_TESTING.md) - Настроить Postman

## 🔧 Полезные команды

### Разработка

```bash
# Запуск в режиме разработки
npm run start:dev

# Сборка проекта
npm run build

# Линтинг
npm run lint
```

### Тестирование

```bash
# Все тесты
npm test

# E2E тесты
npm run test:e2e

# С покрытием
npm run test:cov
```

### Postman

```bash
# Генерация коллекции из Swagger
npm run postman:generate

# Генерация для локального сервера
npm run postman:generate:local
```

### Миграции

```bash
# Генерация миграции
npm run migration:generate -- -n MigrationName

# Применение миграций
npm run migration:run

# Откат миграции
npm run migration:revert
```

## 📝 Примеры использования

### Создание нового модуля

1. Изучите [ADDING_FEATURES.md](./development/ADDING_FEATURES.md)
2. Создайте Entity
3. Создайте миграцию
4. Создайте модуль, сервис, контроллер
5. Напишите тесты

### Добавление нового endpoint

1. Изучите [ADDING_CONTROLLERS.md](./development/ADDING_CONTROLLERS.md)
2. Добавьте метод в контроллер
3. Создайте DTO для валидации
4. Добавьте документацию Swagger
5. Напишите тесты

### Тестирование API

1. Изучите [API_TESTING.md](./testing/API_TESTING.md)
2. Сгенерируйте Postman коллекцию: `npm run postman:generate`
3. Импортируйте коллекцию в Postman
4. Настройте переменные окружения
5. Запустите тесты

## 🎯 Best Practices

- **Следуйте структуре модулей** - используйте единую структуру для всех модулей
- **Валидируйте данные** - всегда используйте DTO для валидации
- **Документируйте API** - используйте Swagger декораторы
- **Пишите тесты** - покрывайте код тестами
- **Поддерживайте качество** - следуйте best practices из CODE_QUALITY.md
- **Используйте типы** - всегда типизируйте данные

## 🔗 Связанные ресурсы

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Swagger/OpenAPI](https://swagger.io/)
- [Postman Documentation](https://learning.postman.com/)

## 📞 Поддержка

Если у вас возникли вопросы:
1. Проверьте соответствующую документацию
2. Изучите примеры в проекте
3. Обратитесь к официальной документации NestJS

---

**Удачной разработки! 🚀**
