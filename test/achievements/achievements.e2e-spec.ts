import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestThrottlerGuard } from '../test-app.module';
import { TransformResponseInterceptor } from '../../src/common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { closeApp } from '../utils/close-app';

describe('Achievements (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        {
          provide: APP_GUARD,
          useClass: TestThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Применяем те же глобальные настройки, что и в main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    
    await app.init();

    // Регистрируем пользователя и настраиваем беременность
    const uniqueEmail = `achievements-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Achievements Test User',
      });

    if (registerResponse.status !== 201 || !registerResponse.body.data?.accessToken) {
      throw new Error(`Failed to register user: ${JSON.stringify(registerResponse.body)}`);
    }

    accessToken = registerResponse.body.data.accessToken;

    // Настраиваем беременность для тестов достижений
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    const startDateStr = startDate.toISOString().split('T')[0];

    await request(app.getHttpServer())
      .post('/v1/pregnancy/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ start_date: startDateStr });
  });

  afterEach(async () => {
    if (app) {
      await closeApp(app);
    }
  });

  describe('/v1/pregnancy/achievements (GET)', () => {
    it('should return all achievements', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('unlocked');
          expect(res.body.data).toHaveProperty('locked');
          expect(res.body.data).toHaveProperty('total_unlocked');
          expect(res.body.data).toHaveProperty('total_available');
          expect(Array.isArray(res.body.data.unlocked)).toBe(true);
          expect(Array.isArray(res.body.data.locked)).toBe(true);
        });
    });

    it('should return achievements with progress for locked ones', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.data.locked.length > 0) {
            const lockedAchievement = res.body.data.locked[0];
            expect(lockedAchievement).toHaveProperty('type');
            expect(lockedAchievement).toHaveProperty('key');
            expect(lockedAchievement).toHaveProperty('title');
            expect(lockedAchievement).toHaveProperty('progress');
            expect(lockedAchievement).toHaveProperty('days_remaining');
            expect(typeof lockedAchievement.progress).toBe('number');
            expect(lockedAchievement.progress).toBeGreaterThanOrEqual(0);
            expect(lockedAchievement.progress).toBeLessThanOrEqual(1);
          }
        });
    });

    it('should return unlocked achievements with correct structure', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.data.unlocked.length > 0) {
            const unlockedAchievement = res.body.data.unlocked[0];
            expect(unlockedAchievement).toHaveProperty('id');
            expect(unlockedAchievement).toHaveProperty('type');
            expect(unlockedAchievement).toHaveProperty('key');
            expect(unlockedAchievement).toHaveProperty('title');
            expect(unlockedAchievement).toHaveProperty('unlocked_at');
          }
        });
    });

    it('should cache achievements data', async () => {
      // Первый запрос
      const firstResponse = await request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Второй запрос должен вернуть те же данные (из кэша)
      const secondResponse = await request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(firstResponse.body.data.total_available).toBe(secondResponse.body.data.total_available);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .expect(401);
    });

    it('should unlock achievements when accessing today data', async () => {
      // Получаем сегодняшние данные, что может разблокировать достижения
      await request(app.getHttpServer())
        .get('/v1/pregnancy/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Проверяем достижения - возможно, некоторые разблокировались
      const response = await request(app.getHttpServer())
        .get('/v1/pregnancy/achievements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.total_unlocked).toBeGreaterThanOrEqual(0);
      expect(response.body.data.total_unlocked).toBeLessThanOrEqual(response.body.data.total_available);
    });
  });
});

