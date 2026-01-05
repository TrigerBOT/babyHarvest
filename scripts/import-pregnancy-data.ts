#!/usr/bin/env ts-node

/**
 * Скрипт для импорта данных о беременности из markdown файла в базу данных
 * 
 * Использование:
 *   npm run import:pregnancy-data
 *   npm run import:pregnancy-data -- --file=docs/pregnancy-data-by-days.md
 *   npm run import:pregnancy-data -- --update=false
 *   npm run import:pregnancy-data -- --stats
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PregnancyDataImporterService } from '../src/database/services/pregnancy-data-importer.service';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Парсинг аргументов командной строки
  const args = process.argv.slice(2);
  const options: {
    file?: string;
    update?: boolean;
    stats?: boolean;
  } = {};

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      options.file = arg.split('=')[1];
    } else if (arg === '--update=false') {
      options.update = false;
    } else if (arg === '--stats') {
      options.stats = true;
    }
  }

  // Путь к файлу по умолчанию
  const filePath = options.file || path.join(__dirname, '../docs/pregnancy-data-by-days.md');
  const updateExisting = options.update !== false; // По умолчанию true

  // Проверка существования файла
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл не найден: ${filePath}`);
    process.exit(1);
  }

  console.log('🚀 Запуск импорта данных о беременности...');
  console.log(`📄 Файл: ${filePath}`);
  console.log(`🔄 Обновление существующих: ${updateExisting ? 'Да' : 'Нет'}`);
  console.log('');

  // Создание NestJS приложения
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const importerService = app.get(PregnancyDataImporterService);

    // Если запрошена статистика
    if (options.stats) {
      console.log('📊 Получение статистики...');
      const stats = await importerService.getStatistics();
      console.log('');
      console.log('📈 Статистика данных в БД:');
      console.log(`   Всего дней: ${stats.totalDays}`);
      console.log(`   По триместрам:`);
      Object.keys(stats.daysByTrimester)
        .sort()
        .forEach((trimester) => {
          console.log(`     Триместр ${trimester}: ${stats.daysByTrimester[parseInt(trimester)]} дней`);
        });
      console.log(`   По неделям:`);
      Object.keys(stats.daysByWeek)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((week) => {
          console.log(`     Неделя ${week}: ${stats.daysByWeek[parseInt(week)]} дней`);
        });
      console.log('');
    }

    // Проверка необходимости обновления
    const needsUpdate = await importerService.needsUpdate(filePath);
    if (!needsUpdate && !updateExisting) {
      console.log('✅ Данные уже актуальны, обновление не требуется');
      await app.close();
      process.exit(0);
    }

    // Импорт данных
    console.log('📥 Начало импорта...');
    const result = await importerService.importFromFile(filePath, updateExisting);

    console.log('');
    console.log('✅ Импорт завершен!');
    console.log(`   Импортировано новых: ${result.imported}`);
    console.log(`   Обновлено существующих: ${result.updated}`);
    if (result.errors > 0) {
      console.log(`   ⚠️  Ошибок: ${result.errors}`);
    }
    console.log('');

    await app.close();
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Ошибка при импорте:', errorMessage);
    if (errorStack) {
      console.error(errorStack);
    }
    await app.close();
    process.exit(1);
  }
}

bootstrap();

