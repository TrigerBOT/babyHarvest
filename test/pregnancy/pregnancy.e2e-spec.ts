import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestThrottlerGuard } from '../test-app.module';
import { TransformResponseInterceptor } from '../../src/common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { closeApp } from '../utils/close-app';

describe('Pregnancy (e2e)', () => {
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

    // Регистрируем пользователя для тестов
    const uniqueEmail = `pregnancy-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Pregnancy Test User',
      });

    if (registerResponse.status !== 201 || !registerResponse.body.data?.accessToken) {
      throw new Error(`Failed to register user: ${JSON.stringify(registerResponse.body)}`);
    }

    accessToken = registerResponse.body.data.accessToken;
  });

  afterEach(async () => {
    if (app) {
      await closeApp(app);
    }
  });

  describe('/v1/pregnancy/setup (POST)', () => {
    it('should setup pregnancy with start_date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const startDateStr = startDate.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          start_date: startDateStr,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('start_date', startDateStr);
          expect(res.body.data).toHaveProperty('current_day');
        });
    });

    it('should setup pregnancy with due_date', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 270);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          due_date: dueDateStr,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('due_date', dueDateStr);
        });
    });

    it('should update existing pregnancy', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Первая настройка
      await request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: startDateStr });

      // Обновление
      const newStartDate = new Date();
      newStartDate.setDate(newStartDate.getDate() - 5);
      const newStartDateStr = newStartDate.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: newStartDateStr })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.start_date).toBe(newStartDateStr);
        });
    });

    it('should return 400 if start_date is in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          start_date: futureDateStr,
        })
        .expect(400);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .send({
          start_date: '2024-01-01',
        })
        .expect(401);
    });
  });

  describe('/v1/pregnancy/today (GET)', () => {
    beforeEach(async () => {
      // Настраиваем беременность перед тестами
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const startDateStr = startDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: startDateStr });
    });

    it('should return today data', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('day');
          expect(res.body.data).toHaveProperty('week');
          expect(res.body.data).toHaveProperty('trimester');
          expect(res.body.data).toHaveProperty('baby');
          expect(res.body.data).toHaveProperty('mother');
          expect(res.body.data).toHaveProperty('image_url');
        });
    });

    it('should return 404 if pregnancy not set up', async () => {
      // Создаем нового пользователя без беременности
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `no-pregnancy-${Date.now()}@example.com`,
          password: 'password123',
        });

      if (newUserResponse.status !== 201 || !newUserResponse.body.data?.accessToken) {
        throw new Error(`Failed to register user: ${JSON.stringify(newUserResponse.body)}`);
      }

      const newToken = newUserResponse.body.data.accessToken;

      return request(app.getHttpServer())
        .get('/v1/pregnancy/today')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(404);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/today')
        .expect(401);
    });
  });

  describe('/v1/pregnancy/day/:day (GET)', () => {
    beforeEach(async () => {
      // Настраиваем беременность (50 дней назад, чтобы можно было запросить день 45)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 50);
      const startDateStr = startDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: startDateStr });
    });

    it('should return data for specific day', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/day/45')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('day', 45);
          expect(res.body.data).toHaveProperty('week');
          expect(res.body.data).toHaveProperty('trimester');
          expect(res.body.data).toHaveProperty('baby');
          expect(res.body.data).toHaveProperty('mother');
          expect(res.body.data).toHaveProperty('image_url');
        });
    });

    it('should return 400 for day less than 1', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/day/0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should return 400 for day greater than 280', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/day/281')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should return 400 for future day', async () => {
      // Настраиваем беременность с сегодняшней датой
      const startDate = new Date();
      const startDateStr = startDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post('/v1/pregnancy/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ start_date: startDateStr });

      // Пытаемся получить данные на день 100 (в будущем)
      return request(app.getHttpServer())
        .get('/v1/pregnancy/day/100')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/v1/pregnancy/day/45')
        .expect(401);
    });
  });
});

