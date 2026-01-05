// Настройка переменных окружения для тестов
// Этот файл выполняется перед всеми тестами

// Увеличиваем лимиты throttler для тестов
process.env.RATE_LIMIT_LIMIT = process.env.RATE_LIMIT_LIMIT || '10000';
process.env.RATE_LIMIT_TTL = process.env.RATE_LIMIT_TTL || '60';
process.env.RATE_LIMIT_BLOCK_DURATION = process.env.RATE_LIMIT_BLOCK_DURATION || '60';

// Настройки для тестовой БД (если нужно)
process.env.NODE_ENV = 'test';

