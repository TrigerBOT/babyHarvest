# Тестирование API через Postman

## Назначение документа

Этот документ описывает использование Postman для тестирования API, механизм автоматической генерации коллекций из Swagger и настройку тестов.

## Автоматическая генерация Postman коллекции из Swagger

### Обзор

Swagger/OpenAPI документация автоматически преобразуется в Postman коллекцию. Это позволяет:
- Автоматически обновлять коллекцию при изменении API
- Экономить время на ручное создание запросов
- Поддерживать синхронизацию между документацией и тестами
- Генерировать тесты и примеры запросов

### Использование

1. Запустите приложение:
```bash
npm run start:dev
```

2. Сгенерируйте коллекцию:
```bash
npm run postman:generate
```

Или для локального сервера:
```bash
npm run postman:generate:local
```

3. Импортируйте коллекцию в Postman:
   - Откройте Postman
   - Нажмите "Import"
   - Выберите файл `postman/generated-collection.json`

## Как работает механизм автогенерации

### Архитектура процесса

```
┌─────────────────┐
│  NestJS App     │
│  (Swagger UI)   │
└────────┬────────┘
         │
         │ GET /docs-json
         ▼
┌─────────────────┐
│  Swagger JSON   │  ← OpenAPI 3.0 спецификация
│  (OpenAPI spec) │
└────────┬────────┘
         │
         │ Парсинг и преобразование
         ▼
┌─────────────────┐
│  Generator      │  ← scripts/generate-postman-collection.js
│  Script         │
└────────┬────────┘
         │
         │ Генерация Postman Collection v2.1
         ▼
┌─────────────────┐
│  Postman        │
│  Collection     │  ← postman/generated-collection.json
└─────────────────┘
```

### Детальный разбор механизма

#### Шаг 1: Загрузка Swagger JSON

Скрипт загружает Swagger спецификацию из двух источников:

```javascript
// Из URL (например, http://localhost:3000/docs-json)
if (source.startsWith('http://') || source.startsWith('https://')) {
  // HTTP/HTTPS запрос
}

// Из файла (локальный файл)
else {
  // Чтение файла с диска
}
```

**Что происходит:**
- Определяется источник (URL или файл)
- Для URL выполняется HTTP GET запрос
- Для файла - чтение с диска
- Результат парсится как JSON

#### Шаг 2: Парсинг Swagger спецификации

Swagger JSON содержит структуру OpenAPI 3.0:

```json
{
  "openapi": "3.0.0",
  "info": { "title": "API", "version": "1.0" },
  "servers": [{ "url": "http://localhost:3000" }],
  "paths": {
    "/auth/login": {
      "post": {
        "summary": "Вход в систему",
        "tags": ["Авторизация"],
        "requestBody": { ... },
        "responses": { ... }
      }
    }
  }
}
```

**Ключевые компоненты:**
- `info` - метаинформация API
- `servers` - базовые URL серверов
- `paths` - все endpoints с методами
- `components` - схемы данных, security схемы

#### Шаг 3: Преобразование в Postman формат

##### 3.1 Создание структуры коллекции

```javascript
const collection = {
  info: {
    name: swaggerJson.info?.title,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    version: '2.1.0'
  },
  variable: [ /* переменные */ ],
  item: [ /* запросы */ ]
};
```

**Переменные коллекции:**
- `baseUrl` - из `swaggerJson.servers[0].url`
- `accessToken` - для авторизации (пустое по умолчанию)
- `refreshToken` - для обновления токенов

##### 3.2 Обработка endpoints

Для каждого пути и метода:

```javascript
Object.entries(swaggerJson.paths).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, operation]) => {
    // Создание Postman запроса
  });
});
```

**Что извлекается:**
- **Метод HTTP**: `GET`, `POST`, `PUT`, `DELETE` и т.д.
- **Путь**: `/auth/login`, `/users/:id` и т.д.
- **Теги**: для группировки запросов
- **Описание**: `summary` и `description`
- **Параметры**: path, query, header параметры
- **Тело запроса**: schema из `requestBody`
- **Безопасность**: требования авторизации

##### 3.3 Генерация заголовков

```javascript
// Авторизация (если требуется)
if (operation.security) {
  item.request.header.push({
    key: 'Authorization',
    value: 'Bearer {{accessToken}}'
  });
}

// Content-Type для POST/PUT/PATCH
if (['post', 'put', 'patch'].includes(method)) {
  item.request.header.push({
    key: 'Content-Type',
    value: 'application/json'
  });
}
```

##### 3.4 Генерация тела запроса

Из `requestBody.content['application/json'].schema`:

```javascript
function generateExampleFromSchema(schema) {
  // Если есть example - используем его
  if (schema.example) return schema.example;
  
  // Иначе генерируем из properties
  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.example) {
        example[key] = prop.example;
      } else {
        // Генерация по типу
        if (prop.type === 'string') {
          example[key] = prop.format === 'email' 
            ? 'user@example.com' 
            : 'string';
        }
        // ... другие типы
      }
    });
    return example;
  }
}
```

**Логика генерации:**
1. Проверяется наличие `example` в schema
2. Если нет - генерируется из `properties`
3. Для каждого свойства:
   - Используется `example` если есть
   - Иначе генерируется значение по типу:
     - `string` → `'string'` или `'user@example.com'` (если format: email)
     - `number` → `0`
     - `boolean` → `false`
     - `array` → `[]`

##### 3.5 Обработка параметров

**Path параметры** (`/users/:id`):
```javascript
if (param.in === 'path') {
  // Заменяем {id} на :id в пути
  item.request.url.path = path.split('/').map(segment => {
    if (segment.startsWith('{')) {
      return `:${segment.slice(1, -1)}`;
    }
    return segment;
  });
}
```

**Query параметры** (`?page=1&limit=10`):
```javascript
if (param.in === 'query') {
  item.request.url.query.push({
    key: param.name,
    value: param.schema?.example || '',
    description: param.description
  });
}
```

##### 3.6 Группировка по тегам

```javascript
const tagsMap = {};

// Группируем запросы по тегам из Swagger
const tag = operation.tags?.[0] || 'Default';
if (!tagsMap[tag]) {
  tagsMap[tag] = {
    name: tag,
    item: []
  };
}
tagsMap[tag].item.push(item);
```

**Результат:**
- Все запросы с тегом "Авторизация" → папка "Авторизация"
- Все запросы с тегом "Users" → папка "Users"

##### 3.7 Автоматические тесты

Для endpoints авторизации добавляются тесты:

```javascript
if (path.includes('/login') || path.includes('/register')) {
  item.event.push({
    listen: 'test',
    script: {
      exec: [
        // Проверка статуса
        "pm.test('Status code is success', function () {",
        "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
        "});",
        
        // Сохранение токенов
        "if (pm.response.code === 200 || pm.response.code === 201) {",
        "    const response = pm.response.json();",
        "    pm.collectionVariables.set('accessToken', response.accessToken);",
        "    pm.collectionVariables.set('refreshToken', response.refreshToken);",
        "}"
      ]
    }
  });
}
```

**Что делают тесты:**
- Проверяют успешный статус ответа
- Автоматически сохраняют токены в переменные коллекции
- Сохраняют userId для дальнейшего использования

#### Шаг 4: Сохранение коллекции

```javascript
fs.writeFileSync(
  outputPath, 
  JSON.stringify(collection, null, 2)
);
```

Результат сохраняется в формате Postman Collection v2.1.0.

### Структура сгенерированной коллекции

```json
{
  "info": {
    "name": "API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000" },
    { "key": "accessToken", "value": "" }
  ],
  "item": [
    {
      "name": "Авторизация",
      "item": [
        {
          "name": "Login",
          "request": { /* запрос */ },
          "event": [ /* тесты */ ]
        }
      ]
    }
  ]
}
```

## Настройка генерации в будущем

### Добавление новых переменных

В функции `convertSwaggerToPostman`:

```javascript
variable: [
  { key: 'baseUrl', value: '...' },
  { key: 'accessToken', value: '' },
  // Добавьте новые переменные
  { key: 'apiKey', value: '' },
  { key: 'environment', value: 'development' }
]
```

### Кастомизация тестов

Измените логику добавления тестов:

```javascript
// Для всех POST запросов
if (method.toLowerCase() === 'post') {
  item.event.push({
    listen: 'test',
    script: {
      exec: [
        "pm.test('Response time < 500ms', function () {",
        "    pm.expect(pm.response.responseTime).to.be.below(500);",
        "});"
      ]
    }
  });
}

// Для защищенных endpoints
if (operation.security) {
  item.event.push({
    listen: 'prerequest',
    script: {
      exec: [
        "if (!pm.collectionVariables.get('accessToken')) {",
        "    throw new Error('Токен не найден. Выполните Login.');",
        "}"
      ]
    }
  });
}
```

### Добавление примеров ответов

```javascript
if (operation.responses) {
  item.response = [];
  
  Object.entries(operation.responses).forEach(([statusCode, response]) => {
    const example = response.content?.['application/json']?.example;
    if (example) {
      item.response.push({
        name: `${statusCode} ${response.description}`,
        originalRequest: item.request,
        status: statusCode,
        code: parseInt(statusCode),
        body: JSON.stringify(example, null, 2)
      });
    }
  });
}
```

### Фильтрация endpoints

Исключите определенные endpoints:

```javascript
// Пропустить определенные пути
const excludedPaths = ['/health', '/metrics'];
if (excludedPaths.includes(path)) {
  return; // Пропустить
}

// Только определенные теги
const allowedTags = ['Auth', 'Users'];
if (!allowedTags.includes(tag)) {
  return; // Пропустить
}
```

### Кастомизация генерации примеров

Улучшите функцию `generateExampleFromSchema`:

```javascript
function generateExampleFromSchema(schema, customExamples = {}) {
  // Использовать кастомные примеры
  if (customExamples[schema.title]) {
    return customExamples[schema.title];
  }
  
  // Ваша логика генерации
  // ...
}
```

### Поддержка разных форматов авторизации

```javascript
// Bearer Token (текущий)
if (operation.security?.some(s => s.bearerAuth)) {
  item.request.header.push({
    key: 'Authorization',
    value: 'Bearer {{accessToken}}'
  });
}

// API Key
if (operation.security?.some(s => s.apiKey)) {
  item.request.header.push({
    key: 'X-API-Key',
    value: '{{apiKey}}'
  });
}

// Basic Auth
if (operation.security?.some(s => s.basicAuth)) {
  item.request.auth = {
    type: 'basic',
    basic: [
      { key: 'username', value: '{{username}}' },
      { key: 'password', value: '{{password}}' }
    ]
  };
}
```

### Генерация документации

Добавьте описания из Swagger:

```javascript
item.request.description = {
  content: operation.description || operation.summary,
  type: 'text/plain'
};
```

## Настройка Postman коллекции

### Переменные окружения

После импорта коллекции настройте переменные:

1. Откройте коллекцию в Postman
2. Перейдите на вкладку "Variables"
3. Установите значения:
   - `baseUrl`: `http://localhost:3000` (или ваш URL)
   - `accessToken`: (оставится пустым, заполнится автоматически)

### Использование

1. **Запустите приложение**: `npm run start:dev`
2. **Выполните Register или Login** - токены автоматически сохранятся
3. **Используйте защищенные endpoints** - токен будет автоматически добавлен в заголовки

### Автоматизация в CI/CD

Добавьте генерацию в процесс сборки:

```json
{
  "scripts": {
    "build": "nest build && npm run postman:generate"
  }
}
```

Или в GitHub Actions:

```yaml
- name: Generate Postman Collection
  run: |
    npm run start:dev &
    sleep 10
    npm run postman:generate
```

## Best Practices

1. **Регулярно обновляйте коллекцию** - после изменений API запускайте генерацию
2. **Используйте переменные** - не хардкодьте URL и токены
3. **Добавляйте тесты** - автоматизируйте проверки
4. **Версионируйте коллекцию** - храните в репозитории
5. **Документируйте** - добавляйте описания в Swagger

## Связанные документы

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Гайд по тестированию
- [ADDING_CONTROLLERS.md](../development/ADDING_CONTROLLERS.md) - Гайд по контроллерам
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - Архитектура
