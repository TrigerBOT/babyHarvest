import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PregnancyService } from './pregnancy.service';
import { CacheService } from '../cache/cache.service';
import { AchievementsService } from '../achievements/achievements.service';
import { Pregnancy } from '../database/entities/pregnancy.entity';
import { PregnancyDay } from '../database/entities/pregnancy-day.entity';
import { PregnancyNotFoundError } from './exceptions/pregnancy-not-found.exception';
import { SetupPregnancyDto } from './dto/setup-pregnancy.dto';

describe('PregnancyService', () => {
  let service: PregnancyService;
  let pregnancyRepository: Repository<Pregnancy>;
  let pregnancyDayRepository: Repository<PregnancyDay>;
  let cacheService: CacheService;

  const mockPregnancyRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPregnancyDayRepository = {
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockAchievementsService = {
    checkAndUnlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PregnancyService,
        {
          provide: getRepositoryToken(Pregnancy),
          useValue: mockPregnancyRepository,
        },
        {
          provide: getRepositoryToken(PregnancyDay),
          useValue: mockPregnancyDayRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AchievementsService,
          useValue: mockAchievementsService,
        },
      ],
    }).compile();

    service = module.get<PregnancyService>(PregnancyService);
    pregnancyRepository = module.get<Repository<Pregnancy>>(getRepositoryToken(Pregnancy));
    pregnancyDayRepository = module.get<Repository<PregnancyDay>>(
      getRepositoryToken(PregnancyDay),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCurrentDay', () => {
    it('should calculate current day from startDate', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10); // 10 дней назад

      const result = service.calculateCurrentDay(startDate);

      expect(result).toBe(11); // 10 дней + 1
    });

    it('should calculate current day from dueDate', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 270); // 270 дней в будущем

      const result = service.calculateCurrentDay(undefined, dueDate);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(280);
    });

    it('should throw error if neither startDate nor dueDate provided', () => {
      expect(() => service.calculateCurrentDay()).toThrow('Either startDate or dueDate is required');
    });

    it('should clamp day to 1 if negative', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10); // в будущем

      const result = service.calculateCurrentDay(startDate);

      expect(result).toBe(1);
    });

    it('should clamp day to 280 if exceeds', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 300); // 300 дней назад

      const result = service.calculateCurrentDay(startDate);

      expect(result).toBe(280);
    });
  });

  describe('getDayData', () => {
    it('should return day data', async () => {
      const day = 45;
      const mockDayData = {
        id: 'day-id',
        day: 45,
        week: 7,
        trimester: 2,
        babySize: '15 cm',
        babyWeight: '200 g',
        babyDevelopment: 'Development text',
        motherChanges: 'Changes text',
        tips: ['tip1', 'tip2'],
      };

      mockPregnancyDayRepository.findOne.mockResolvedValue(mockDayData);

      const result = await service.getDayData(day);

      expect(pregnancyDayRepository.findOne).toHaveBeenCalledWith({ where: { day } });
      expect(result).toEqual(mockDayData);
    });

    it('should throw NotFoundException if day data not found', async () => {
      const day = 999;

      mockPregnancyDayRepository.findOne.mockResolvedValue(null);

      await expect(service.getDayData(day)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getImageUrl', () => {
    it('should return correct image URL', () => {
      const week = 5;
      const result = service.getImageUrl(week);

      expect(result).toBe('/images/embryo/week-5.jpg');
    });
  });

  describe('getPregnancyByUserId', () => {
    it('should return pregnancy for user', async () => {
      const userId = 'user-id';
      const mockPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate: new Date(),
        dueDate: new Date(),
      };

      mockPregnancyRepository.findOne.mockResolvedValue(mockPregnancy);

      const result = await service.getPregnancyByUserId(userId);

      expect(pregnancyRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual(mockPregnancy);
    });

    it('should return null if pregnancy not found', async () => {
      const userId = 'non-existent-id';

      mockPregnancyRepository.findOne.mockResolvedValue(null);

      const result = await service.getPregnancyByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('getTodayData', () => {
    it('should return cached data if available', async () => {
      const userId = 'user-id';
      const cachedData = {
        day: 45,
        week: 7,
        trimester: 2,
        baby: { size: '15 cm', weight: '200 g', development: 'dev' },
        mother: { changes: 'changes' },
        tips: [],
        image_url: '/images/embryo/week-7.jpg',
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.getTodayData(userId);

      expect(cacheService.get).toHaveBeenCalledWith(`pregnancy:today:${userId}`);
      expect(result).toEqual(cachedData);
      expect(pregnancyRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return fresh data if cache miss', async () => {
      const userId = 'user-id';
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

      const mockPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate,
        dueDate: undefined,
      };

      const mockDayData = {
        day: 11,
        week: 2,
        trimester: 1,
        babySize: '5 cm',
        babyWeight: '10 g',
        babyDevelopment: 'Development',
        motherChanges: 'Changes',
        tips: [],
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPregnancyRepository.findOne.mockResolvedValue(mockPregnancy);
      mockPregnancyDayRepository.findOne.mockResolvedValue(mockDayData);
      mockAchievementsService.checkAndUnlock.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getTodayData(userId);

      expect(cacheService.get).toHaveBeenCalled();
      expect(pregnancyRepository.findOne).toHaveBeenCalled();
      expect(pregnancyDayRepository.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('day');
      expect(result).toHaveProperty('image_url');
    });

    it('should throw PregnancyNotFoundError if pregnancy not found', async () => {
      const userId = 'non-existent-id';

      mockCacheService.get.mockResolvedValue(null);
      mockPregnancyRepository.findOne.mockResolvedValue(null);

      await expect(service.getTodayData(userId)).rejects.toThrow(PregnancyNotFoundError);
    });
  });

  describe('setupPregnancy', () => {
    it('should create new pregnancy', async () => {
      const userId = 'user-id';
      const dto: SetupPregnancyDto = {
        start_date: '2024-01-01',
      };

      const startDate = new Date('2024-01-01');
      const mockPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate,
        dueDate: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPregnancyRepository.findOne.mockResolvedValue(null);
      mockPregnancyRepository.create.mockReturnValue(mockPregnancy);
      mockPregnancyRepository.save.mockResolvedValue(mockPregnancy);
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await service.setupPregnancy(userId, dto);

      expect(pregnancyRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(pregnancyRepository.create).toHaveBeenCalled();
      expect(pregnancyRepository.save).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(result).toEqual(mockPregnancy);
    });

    it('should update existing pregnancy', async () => {
      const userId = 'user-id';
      const dto: SetupPregnancyDto = {
        start_date: '2024-01-01',
        due_date: '2024-10-15',
      };

      const existingPregnancy = {
        id: 'pregnancy-id',
        userId,
        startDate: new Date('2024-01-01'),
        dueDate: undefined,
      };

      mockPregnancyRepository.findOne.mockResolvedValue(existingPregnancy);
      mockPregnancyRepository.save.mockResolvedValue(existingPregnancy);
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await service.setupPregnancy(userId, dto);

      expect(pregnancyRepository.save).toHaveBeenCalled();
      expect(result).toEqual(existingPregnancy);
    });

    it('should throw error if startDate is in future', async () => {
      const userId = 'user-id';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dto: SetupPregnancyDto = {
        start_date: futureDate.toISOString().split('T')[0],
      };

      mockPregnancyRepository.findOne.mockResolvedValue(null);

      await expect(service.setupPregnancy(userId, dto)).rejects.toThrow(
        'start_date cannot be in the future',
      );
    });

    it('should throw error if dueDate is before startDate', async () => {
      const userId = 'user-id';
      const dto: SetupPregnancyDto = {
        start_date: '2024-01-01',
        due_date: '2023-12-01',
      };

      mockPregnancyRepository.findOne.mockResolvedValue(null);

      await expect(service.setupPregnancy(userId, dto)).rejects.toThrow(
        'due_date must be after start_date',
      );
    });
  });
});

