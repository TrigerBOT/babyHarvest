import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Achievement, AchievementType } from '../database/entities/achievement.entity';
import { Pregnancy } from '../database/entities/pregnancy.entity';
import { CacheService } from '../cache/cache.service';
import { ACHIEVEMENTS_CONFIG } from './config/achievements.config';
import { AchievementsResponseDto } from './dto/achievements-response.dto';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(Pregnancy)
    private pregnancyRepository: Repository<Pregnancy>,
    private cacheService: CacheService,
    private dataSource: DataSource,
  ) {}

  /**
   * Проверка и разблокировка достижений
   */
  async checkAndUnlock(
    userId: string,
    day: number,
    week: number,
  ): Promise<Achievement[]> {
    // Получаем все разблокированные достижения пользователя
    const unlockedAchievements = await this.achievementRepository.find({
      where: { userId },
    });

    const unlockedKeys = new Set(
      unlockedAchievements.map((a) => `${a.achievementType}:${a.achievementKey}`),
    );

    const newAchievements: Achievement[] = [];

    // Проверяем каждое достижение из конфигурации
    for (const config of ACHIEVEMENTS_CONFIG) {
      const key = `${config.type}:${config.key}`;
      if (unlockedKeys.has(key)) {
        continue; // Уже разблокировано
      }

      // Проверяем условие
      let shouldUnlock = false;
      if (config.week !== undefined && week >= config.week) {
        shouldUnlock = true;
      } else if (config.day !== undefined && day >= config.day) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        // Создаем достижение в транзакции
        const achievement = await this.dataSource.transaction(
          async (manager) => {
            const achievementRepo = manager.getRepository(Achievement);
            const achievement = achievementRepo.create({
              userId,
              achievementType: config.type as AchievementType,
              achievementKey: config.key,
              title: config.title,
              description: config.description,
              icon: config.icon,
            });
            return achievementRepo.save(achievement);
          },
        );

        newAchievements.push(achievement);
        unlockedKeys.add(key);
      }
    }

    // Инвалидируем кэш при разблокировке новых достижений
    if (newAchievements.length > 0) {
      const cacheKey = `pregnancy:achievements:${userId}`;
      await this.cacheService.delete(cacheKey);
    }

    return newAchievements;
  }

  /**
   * Получение всех достижений (разблокированных и заблокированных)
   */
  async getAllAchievements(userId: string): Promise<AchievementsResponseDto> {
    const cacheKey = `pregnancy:achievements:${userId}`;

    // Проверка кэша
    const cached = await this.cacheService.get<AchievementsResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Получаем разблокированные достижения
    const unlocked = await this.achievementRepository.find({
      where: { userId },
      order: { unlockedAt: 'ASC' },
    });

    // Получаем текущий день/неделю для расчета прогресса
    const pregnancy = await this.pregnancyRepository.findOne({
      where: { userId },
    });

    let currentDay = 0;
    let currentWeek = 0;

    if (pregnancy) {
      // Рассчитываем текущий день
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (pregnancy.startDate) {
        const start = new Date(pregnancy.startDate);
        start.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        currentDay = diffDays + 1;
      } else if (pregnancy.dueDate) {
        const due = new Date(pregnancy.dueDate);
        due.setHours(0, 0, 0, 0);
        const start = new Date(due);
        start.setDate(start.getDate() - 280);
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        currentDay = diffDays + 1;
      }

      if (currentDay > 0) {
        currentWeek = Math.ceil(currentDay / 7);
      }
    }

    const unlockedKeys = new Set(
      unlocked.map((a) => `${a.achievementType}:${a.achievementKey}`),
    );

    // Формируем список заблокированных достижений с прогрессом
    const locked = ACHIEVEMENTS_CONFIG.filter(
      (config) => !unlockedKeys.has(`${config.type}:${config.key}`),
    ).map((config) => {
      let progress = 0;
      let daysRemaining = 0;

      if (config.week !== undefined) {
        if (currentWeek >= config.week) {
          progress = 1;
        } else {
          const daysNeeded = config.week * 7;
          progress = currentDay / daysNeeded;
          daysRemaining = daysNeeded - currentDay;
        }
      } else if (config.day !== undefined) {
        if (currentDay >= config.day) {
          progress = 1;
        } else {
          progress = currentDay / config.day;
          daysRemaining = config.day - currentDay;
        }
      }

      return {
        type: config.type,
        key: config.key,
        title: config.title,
        description: config.description || '',
        progress: Math.min(progress, 1),
        days_remaining: Math.max(daysRemaining, 0),
      };
    });

    const response: AchievementsResponseDto = {
      unlocked: unlocked.map((a) => ({
        id: a.id,
        type: a.achievementType,
        key: a.achievementKey,
        title: a.title,
        description: a.description || '',
        icon: a.icon,
        unlocked_at: a.unlockedAt.toISOString(),
      })),
      locked,
      total_unlocked: unlocked.length,
      total_available: ACHIEVEMENTS_CONFIG.length,
    };

    // Кэширование (TTL: 30 минут)
    await this.cacheService.set(cacheKey, response, 1800);

    return response;
  }
}

