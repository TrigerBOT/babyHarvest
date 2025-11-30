import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pregnancy } from '../database/entities/pregnancy.entity';
import { PregnancyDay } from '../database/entities/pregnancy-day.entity';
import { CacheService } from '../cache/cache.service';
import { PregnancyNotFoundError } from './exceptions/pregnancy-not-found.exception';
import { SetupPregnancyDto } from './dto/setup-pregnancy.dto';
import { TodayDataResponseDto } from './dto/today-data-response.dto';
import { PregnancyDayResponseDto } from './dto/pregnancy-day-response.dto';
import { AchievementsService } from '../achievements/achievements.service';

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

  /**
   * Расчет текущего дня беременности
   */
  calculateCurrentDay(startDate?: Date, dueDate?: Date): number {
    if (!startDate && !dueDate) {
      throw new Error('Either startDate or dueDate is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDay: number;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      currentDay = diffDays + 1;
    } else if (dueDate) {
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      // Рассчитываем startDate как dueDate - 280 дней
      const start = new Date(due);
      start.setDate(start.getDate() - 280);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      currentDay = diffDays + 1;
    } else {
      throw new Error('Either startDate or dueDate is required');
    }

    // Валидация: день должен быть в диапазоне 1-280
    if (currentDay < 1) {
      currentDay = 1;
    } else if (currentDay > 280) {
      currentDay = 280;
    }

    return currentDay;
  }

  /**
   * Получение данных дня из БД
   */
  async getDayData(day: number): Promise<PregnancyDay> {
    const dayData = await this.pregnancyDayRepository.findOne({
      where: { day },
    });

    if (!dayData) {
      throw new NotFoundException(`Data for day ${day} not found`);
    }

    return dayData;
  }

  /**
   * Формирование URL изображения
   */
  getImageUrl(week: number): string {
    return `/images/embryo/week-${week}.jpg`;
  }

  /**
   * Получение беременности пользователя
   */
  async getPregnancyByUserId(userId: string): Promise<Pregnancy | null> {
    return this.pregnancyRepository.findOne({
      where: { userId },
    });
  }

  /**
   * Получение данных на текущий день
   */
  async getTodayData(userId: string): Promise<TodayDataResponseDto> {
    const cacheKey = `pregnancy:today:${userId}`;

    // Проверка кэша
    const cached = await this.cacheService.get<TodayDataResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Получение беременности
    const pregnancy = await this.getPregnancyByUserId(userId);
    if (!pregnancy) {
      throw new PregnancyNotFoundError();
    }

    // Расчет текущего дня
    const currentDay = this.calculateCurrentDay(
      pregnancy.startDate,
      pregnancy.dueDate,
    );

    // Получение данных дня
    const dayData = await this.getDayData(currentDay);

    // Формирование image_url
    const imageUrl = this.getImageUrl(dayData.week);

    // Проверка достижений
    const newAchievements = await this.achievementsService.checkAndUnlock(
      userId,
      currentDay,
      dayData.week,
    );

    // Формирование ответа
    const response: TodayDataResponseDto = {
      day: dayData.day,
      week: dayData.week,
      trimester: dayData.trimester,
      baby: {
        size: dayData.babySize,
        weight: dayData.babyWeight,
        development: dayData.babyDevelopment,
      },
      mother: {
        changes: dayData.motherChanges,
      },
      tips: dayData.tips || [],
      image_url: imageUrl,
      new_achievements:
        newAchievements.length > 0
          ? newAchievements.map((a) => ({
              id: a.id,
              type: a.achievementType,
              key: a.achievementKey,
              title: a.title,
              description: a.description || '',
              unlocked_at: a.unlockedAt.toISOString(),
            }))
          : undefined,
    };

    // Кэширование (TTL: 1 час)
    await this.cacheService.set(cacheKey, response, 3600);

    return response;
  }

  /**
   * Получение данных на конкретный день
   */
  async getDayDataResponse(day: number): Promise<PregnancyDayResponseDto> {
    const dayData = await this.getDayData(day);
    const imageUrl = this.getImageUrl(dayData.week);

    return {
      day: dayData.day,
      week: dayData.week,
      trimester: dayData.trimester,
      baby: {
        size: dayData.babySize,
        weight: dayData.babyWeight,
        development: dayData.babyDevelopment,
      },
      mother: {
        changes: dayData.motherChanges,
      },
      tips: dayData.tips || [],
      image_url: imageUrl,
    };
  }

  /**
   * Настройка беременности
   */
  async setupPregnancy(
    userId: string,
    dto: SetupPregnancyDto,
  ): Promise<Pregnancy> {
    // Валидация дат
    const startDate = dto.start_date ? new Date(dto.start_date) : undefined;
    const dueDate = dto.due_date ? new Date(dto.due_date) : undefined;

    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate > today) {
        throw new Error('start_date cannot be in the future');
      }
    }

    if (startDate && dueDate) {
      if (dueDate <= startDate) {
        throw new Error('due_date must be after start_date');
      }

      // Проверка срока беременности (не более 42 недель = 294 дня)
      const diffTime = dueDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 294) {
        throw new Error('Pregnancy duration cannot exceed 42 weeks (294 days)');
      }
    }

    // Поиск существующей беременности
    let pregnancy = await this.getPregnancyByUserId(userId);

    if (pregnancy) {
      // Обновление существующей
      if (startDate) pregnancy.startDate = startDate;
      if (dueDate) pregnancy.dueDate = dueDate;
      await this.pregnancyRepository.save(pregnancy);
    } else {
      // Создание новой
      pregnancy = this.pregnancyRepository.create({
        userId,
        startDate,
        dueDate,
      });
      await this.pregnancyRepository.save(pregnancy);
    }

    // Инвалидация кэша
    const cacheKey = `pregnancy:today:${userId}`;
    await this.cacheService.delete(cacheKey);

    return pregnancy;
  }
}

