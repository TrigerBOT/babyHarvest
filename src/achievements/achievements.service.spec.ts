import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AchievementsService } from './achievements.service';
import { CacheService } from '../cache/cache.service';
import { Achievement } from '../database/entities/achievement.entity';
import { Pregnancy } from '../database/entities/pregnancy.entity';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let achievementRepository: Repository<Achievement>;
  let pregnancyRepository: Repository<Pregnancy>;
  let cacheService: CacheService;

  const mockAchievementRepository = {
    find: jest.fn(),
  };

  const mockPregnancyRepository = {
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        {
          provide: getRepositoryToken(Achievement),
          useValue: mockAchievementRepository,
        },
        {
          provide: getRepositoryToken(Pregnancy),
          useValue: mockPregnancyRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
    achievementRepository = module.get<Repository<Achievement>>(getRepositoryToken(Achievement));
    pregnancyRepository = module.get<Repository<Pregnancy>>(getRepositoryToken(Pregnancy));
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndUnlock', () => {
    it('should not unlock already unlocked achievements', async () => {
      const userId = 'user-id';
      const day = 10;
      const week = 2;

      const unlockedAchievements = [
        {
          id: 'achievement-id',
          userId,
          achievementType: 'milestone' as any,
          achievementKey: 'first_week',
          title: 'First Week',
        },
      ];

      mockAchievementRepository.find.mockResolvedValue(unlockedAchievements);

      const result = await service.checkAndUnlock(userId, day, week);

      expect(achievementRepository.find).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual([]);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should unlock new achievement when condition met', async () => {
      const userId = 'user-id';
      const day = 28; // 4 недели = 28 дней
      const week = 4; // Первое достижение разблокируется на week >= 4

      const newAchievement = {
        id: 'new-achievement-id',
        userId,
        achievementType: 'milestone' as any,
        achievementKey: 'week_4',
        title: 'Первые недели',
        description: 'Description',
        unlockedAt: new Date(),
      };

      mockAchievementRepository.find.mockResolvedValue([]);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            create: jest.fn().mockReturnValue(newAchievement),
            save: jest.fn().mockResolvedValue(newAchievement),
          }),
        };
        return callback(mockManager);
      });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await service.checkAndUnlock(userId, day, week);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
      expect(cacheService.delete).toHaveBeenCalled();
    });

    it('should not unlock achievement if condition not met', async () => {
      const userId = 'user-id';
      const day = 1;
      const week = 1;

      mockAchievementRepository.find.mockResolvedValue([]);

      await service.checkAndUnlock(userId, day, week);

      // Проверяем, что если день/неделя меньше требуемых, достижение не разблокируется
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('getAllAchievements', () => {
    it('should return cached data if available', async () => {
      const userId = 'user-id';
      const cachedData = {
        unlocked: [],
        locked: [],
        total_unlocked: 0,
        total_available: 10,
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getAllAchievements(userId);

      expect(cacheService.get).toHaveBeenCalledWith(`pregnancy:achievements:${userId}`);
      expect(result).toEqual(cachedData);
      expect(achievementRepository.find).not.toHaveBeenCalled();
    });

    it('should return fresh data with unlocked and locked achievements', async () => {
      const userId = 'user-id';
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

      const unlockedAchievements = [
        {
          id: 'achievement-id',
          userId,
          achievementType: 'milestone' as any,
          achievementKey: 'first_week',
          title: 'First Week',
          description: 'Description',
          icon: 'icon',
          unlockedAt: new Date(),
        },
      ];

      const mockPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate,
        dueDate: undefined,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAchievementRepository.find.mockResolvedValue(unlockedAchievements);
      mockPregnancyRepository.findOne.mockResolvedValue(mockPregnancy);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getAllAchievements(userId);

      expect(achievementRepository.find).toHaveBeenCalled();
      expect(pregnancyRepository.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('unlocked');
      expect(result).toHaveProperty('locked');
      expect(result).toHaveProperty('total_unlocked');
      expect(result).toHaveProperty('total_available');
      expect(result.unlocked.length).toBe(1);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should calculate progress for locked achievements', async () => {
      const userId = 'user-id';
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5); // 5 дней назад

      const mockPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate,
        dueDate: undefined,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAchievementRepository.find.mockResolvedValue([]);
      mockPregnancyRepository.findOne.mockResolvedValue(mockPregnancy);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getAllAchievements(userId);

      expect(result.locked.length).toBeGreaterThan(0);
      // Проверяем, что у заблокированных достижений есть progress
      if (result.locked.length > 0) {
        expect(result.locked[0]).toHaveProperty('progress');
        expect(result.locked[0]).toHaveProperty('days_remaining');
      }
    });
  });
});

