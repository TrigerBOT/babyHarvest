#!/usr/bin/env node

/**
 * Простой скрипт для тестирования API авторизации
 * Запуск: node scripts/test-auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🚀 Тестирование API авторизации...\n');

  try {
    // Тест 1: Регистрация нового пользователя
    console.log('1. Тестирование регистрации...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    console.log('✅ Регистрация успешна');
    console.log('   Access Token:', registerResponse.data.accessToken.substring(0, 20) + '...');
    console.log('   User ID:', registerResponse.data.user.id);
    console.log('   User Email:', registerResponse.data.user.email);
    console.log('');

    const accessToken = registerResponse.data.accessToken;

    // Тест 2: Получение информации о текущем пользователе
    console.log('2. Тестирование получения информации о пользователе...');
    const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('✅ Получение информации о пользователе успешно');
    console.log('   User ID:', meResponse.data.id);
    console.log('   User Email:', meResponse.data.email);
    console.log('   User Name:', meResponse.data.name);
    console.log('');

    // Тест 3: Вход в систему
    console.log('3. Тестирование входа в систему...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123',
    });

    console.log('✅ Вход в систему успешен');
    console.log('   Access Token:', loginResponse.data.accessToken.substring(0, 20) + '...');
    console.log('');

    // Тест 4: Обновление токена
    console.log('4. Тестирование обновления токена...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: registerResponse.data.refreshToken,
    });

    console.log('✅ Обновление токена успешно');
    console.log('   New Access Token:', refreshResponse.data.accessToken.substring(0, 20) + '...');
    console.log('');

    // Тест 5: Выход из системы
    console.log('5. Тестирование выхода из системы...');
    const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('✅ Выход из системы успешен');
    console.log('   Message:', logoutResponse.data.message);
    console.log('');

    console.log('🎉 Все тесты прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Проверяем, что сервер запущен
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Проверка доступности сервера...');
  
  const isServerRunning = await checkServer();
  if (!isServerRunning) {
    console.error('❌ Сервер не запущен. Убедитесь, что приложение запущено на порту 3000');
    console.log('   Запустите: npm run start:dev');
    process.exit(1);
  }

  console.log('✅ Сервер доступен\n');
  await testAuth();
}

main();
