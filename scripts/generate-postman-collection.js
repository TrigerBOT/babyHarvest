const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Загружает Swagger JSON из URL или файла
 */
async function loadSwaggerJson(source) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return new Promise((resolve, reject) => {
      const client = source.startsWith('https') ? https : http;
      client.get(source, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Ошибка парсинга JSON: ${error.message}`));
          }
        });
      }).on('error', reject);
    });
  } else {
    // Чтение из файла
    const filePath = path.isAbsolute(source) ? source : path.join(__dirname, '..', source);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл не найден: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
}

/**
 * Конвертирует Swagger в Postman коллекцию
 */
function convertSwaggerToPostman(swaggerJson) {
  const collection = {
    info: {
      name: swaggerJson.info?.title || 'API Collection',
      description: swaggerJson.info?.description || 'Generated from Swagger',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: swaggerJson.info?.version || '1.0.0',
    },
    variable: [
      {
        key: 'baseUrl',
        value: swaggerJson.servers?.[0]?.url?.replace(/\/$/, '') || 'http://localhost:3000',
        type: 'string',
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string',
      },
      {
        key: 'refreshToken',
        value: '',
        type: 'string',
      },
    ],
    item: [],
  };

  // Группируем по тегам
  const tagsMap = {};

  if (swaggerJson.paths) {
    Object.entries(swaggerJson.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        const tag = operation.tags?.[0] || 'Default';
        
        if (!tagsMap[tag]) {
          tagsMap[tag] = {
            name: tag,
            item: [],
          };
        }

        const item = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [],
            body: {},
            url: {
              raw: `{{baseUrl}}${path}`,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean),
            },
          },
          response: [],
          event: [],
        };

        // Добавляем заголовки
        if (operation.security) {
          item.request.header.push({
            key: 'Authorization',
            value: 'Bearer {{accessToken}}',
            type: 'text',
          });
        }

        // Добавляем Content-Type для POST/PUT/PATCH
        if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
          item.request.header.push({
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          });
        }

        // Добавляем тело запроса
        if (operation.requestBody) {
          const schema = operation.requestBody.content?.['application/json']?.schema;
          if (schema) {
            item.request.body = {
              mode: 'raw',
              raw: JSON.stringify(generateExampleFromSchema(schema), null, 2),
              options: {
                raw: {
                  language: 'json',
                },
              },
            };
          }
        }

        // Добавляем параметры пути
        if (operation.parameters) {
          operation.parameters.forEach((param) => {
            if (param.in === 'path') {
              item.request.url.path = item.request.url.path.map((segment) => {
                if (segment === `{${param.name}}` || segment === `:${param.name}`) {
                  return `:${param.name}`;
                }
                return segment;
              });
            } else if (param.in === 'query') {
              if (!item.request.url.query) {
                item.request.url.query = [];
              }
              item.request.url.query.push({
                key: param.name,
                value: param.schema?.example || '',
                description: param.description,
              });
            }
          });
        }

        // Добавляем тесты для сохранения токенов
        if (path.includes('/login') || path.includes('/register')) {
          item.event.push({
            listen: 'test',
            script: {
              exec: [
                "pm.test('Status code is success', function () {",
                "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                "});",
                "",
                "if (pm.response.code === 200 || pm.response.code === 201) {",
                "    const response = pm.response.json();",
                "    if (response.accessToken) {",
                "        pm.collectionVariables.set('accessToken', response.accessToken);",
                "        console.log('✅ Access token сохранен');",
                "    }",
                "    if (response.refreshToken) {",
                "        pm.collectionVariables.set('refreshToken', response.refreshToken);",
                "        console.log('✅ Refresh token сохранен');",
                "    }",
                "    if (response.user && response.user.id) {",
                "        pm.collectionVariables.set('userId', response.user.id);",
                "    }",
                "}",
              ],
              type: 'text/javascript',
            },
          });
        }

        tagsMap[tag].item.push(item);
      });
    });
  }

  // Преобразуем объект в массив
  collection.item = Object.values(tagsMap);

  return collection;
}

/**
 * Генерирует пример из JSON Schema
 */
function generateExampleFromSchema(schema) {
  if (schema.example) {
    return schema.example;
  }

  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.example !== undefined) {
        example[key] = prop.example;
      } else if (prop.type === 'string') {
        example[key] = prop.format === 'email' ? 'user@example.com' : 'string';
      } else if (prop.type === 'number') {
        example[key] = 0;
      } else if (prop.type === 'boolean') {
        example[key] = false;
      } else if (prop.type === 'array') {
        example[key] = [];
      }
    });
    return example;
  }

  return {};
}

/**
 * Главная функция
 */
async function generatePostmanCollection() {
  const swaggerUrl = process.env.SWAGGER_URL || 'http://localhost:3000/docs-json';
  const outputPath = path.join(__dirname, '../postman/generated-collection.json');

  console.log(`📥 Загрузка Swagger из: ${swaggerUrl}`);

  try {
    // Загружаем Swagger JSON
    const swaggerJson = await loadSwaggerJson(swaggerUrl);

    console.log('🔄 Конвертация в Postman коллекцию...');

    // Конвертируем в Postman коллекцию
    const collection = convertSwaggerToPostman(swaggerJson);

    // Создаем директорию, если не существует
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Сохраняем коллекцию
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`✅ Postman коллекция успешно создана: ${outputPath}`);
    console.log(`📊 Создано ${collection.item.length} групп, ${collection.item.reduce((sum, group) => sum + group.item.length, 0)} запросов`);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  generatePostmanCollection();
}

module.exports = { generatePostmanCollection };

