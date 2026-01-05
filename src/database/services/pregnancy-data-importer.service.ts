import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { PregnancyDay } from '../entities/pregnancy-day.entity';
import { PregnancyDataParser, ParsedPregnancyDay } from '../utils/pregnancy-data-parser';

@Injectable()
export class PregnancyDataImporterService {
  private readonly logger = new Logger(PregnancyDataImporterService.name);

  constructor(
    @InjectRepository(PregnancyDay)
    private pregnancyDayRepository: Repository<PregnancyDay>,
  ) {}

  /**
   * Импортирует данные из markdown файла в базу данных
   * @param filePath Путь к markdown файлу
   * @param updateExisting Обновлять ли существующие записи (по умолчанию true)
   */
  async importFromFile(
    filePath: string,
    updateExisting: boolean = true,
  ): Promise<{ imported: number; updated: number; errors: number }> {
    this.logger.log(`Начало импорта данных из файла: ${filePath}`);

    // Парсинг файла
    let parsedDays: ParsedPregnancyDay[];
    try {
      parsedDays = PregnancyDataParser.parseMarkdownFile(filePath);
      this.logger.log(`Распарсено ${parsedDays.length} дней`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Ошибка при парсинге файла: ${errorMessage}`, errorStack);
      throw error;
    }

    // Валидация данных
    const validation = PregnancyDataParser.validateData(parsedDays);
    if (!validation.valid) {
      this.logger.error('Ошибки валидации данных:');
      validation.errors.forEach((error) => this.logger.error(`  - ${error}`));
      throw new Error(`Валидация не пройдена: ${validation.errors.join('; ')}`);
    }

    this.logger.log('Валидация данных пройдена успешно');

    // Импорт данных
    return this.importData(parsedDays, updateExisting);
  }

  /**
   * Импортирует данные из массива объектов
   */
  async importData(
    parsedDays: ParsedPregnancyDay[],
    updateExisting: boolean = true,
  ): Promise<{ imported: number; updated: number; errors: number }> {
    let imported = 0;
    let updated = 0;
    let errors = 0;

    // Сортируем по дню для последовательной обработки
    parsedDays.sort((a, b) => a.day - b.day);

    for (const dayData of parsedDays) {
      try {
        // Проверяем существование записи
        const existing = await this.pregnancyDayRepository.findOne({
          where: { day: dayData.day },
        });

        if (existing) {
          if (updateExisting) {
            // Обновляем существующую запись
            existing.week = dayData.week;
            existing.trimester = dayData.trimester;
            existing.babySize = dayData.babySize;
            existing.babyWeight = dayData.babyWeight;
            existing.babyDevelopment = dayData.babyDevelopment;
            existing.motherChanges = dayData.motherChanges;
            existing.tips = dayData.tips;

            await this.pregnancyDayRepository.save(existing);
            updated++;
            this.logger.debug(`Обновлен день ${dayData.day}`);
          } else {
            this.logger.debug(`День ${dayData.day} уже существует, пропущен`);
          }
        } else {
          // Создаем новую запись
          const newDay = this.pregnancyDayRepository.create({
            day: dayData.day,
            week: dayData.week,
            trimester: dayData.trimester,
            babySize: dayData.babySize,
            babyWeight: dayData.babyWeight,
            babyDevelopment: dayData.babyDevelopment,
            motherChanges: dayData.motherChanges,
            tips: dayData.tips,
          });

          await this.pregnancyDayRepository.save(newDay);
          imported++;
          this.logger.debug(`Импортирован день ${dayData.day}`);
        }
      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Ошибка при импорте дня ${dayData.day}: ${errorMessage}`,
          errorStack,
        );
      }
    }

    this.logger.log(
      `Импорт завершен: импортировано ${imported}, обновлено ${updated}, ошибок ${errors}`,
    );

    return { imported, updated, errors };
  }

  /**
   * Проверяет, нужно ли обновлять данные (сравнивает хеш содержимого файла)
   */
  async needsUpdate(filePath: string): Promise<boolean> {
    try {
      // Проверяем существование файла
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // Проверяем количество записей в БД
      const count = await this.pregnancyDayRepository.count();

      // Если записей нет или меньше 280, нужен импорт
      if (count < 280) {
        return true;
      }

      // TODO: Можно добавить сохранение хеша файла в БД для отслеживания изменений
      // Для этого нужно:
      // 1. Создать таблицу для хранения метаданных импорта
      // 2. Сохранять хеш файла при каждом импорте
      // 3. Сравнивать текущий хеш с сохраненным

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка при проверке необходимости обновления: ${errorMessage}`);
      return true; // В случае ошибки лучше обновить
    }
  }

  /**
   * Получает статистику по данным в БД
   */
  async getStatistics(): Promise<{
    totalDays: number;
    daysByTrimester: { [key: number]: number };
    daysByWeek: { [key: number]: number };
  }> {
    const totalDays = await this.pregnancyDayRepository.count();

    const allDays = await this.pregnancyDayRepository.find({
      select: ['trimester', 'week'],
    });

    const daysByTrimester: { [key: number]: number } = {};
    const daysByWeek: { [key: number]: number } = {};

    for (const day of allDays) {
      daysByTrimester[day.trimester] = (daysByTrimester[day.trimester] || 0) + 1;
      daysByWeek[day.week] = (daysByWeek[day.week] || 0) + 1;
    }

    return {
      totalDays,
      daysByTrimester,
      daysByWeek,
    };
  }
}

