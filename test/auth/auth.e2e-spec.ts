import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestThrottlerGuard } from '../test-app.module';
import { TransformResponseInterceptor } from '../../src/common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { closeApp } from '../utils/close-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

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
  });

  afterEach(async () => {
    if (app) {
      await closeApp(app);
    }
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user.email).toBe(uniqueEmail);
          expect(res.body.data.user.name).toBe('Test User');
        });
    });

    it('should return 409 for duplicate email', async () => {
      // Сначала регистрируем пользователя
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      // Пытаемся зарегистрировать с тем же email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('error');
        });
    });

    it('should return 400 for short password', () => {
      const uniqueEmail = `test2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: '123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('error');
        });
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Регистрируем пользователя для тестов входа
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login User',
        });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user.email).toBe('login@example.com');
        });
    });

    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;
    let userEmail: string;

    beforeEach(async () => {
      // Регистрируем пользователя и получаем токен
      userEmail = `me-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'password123',
          name: 'Me User',
        });

      if (response.status !== 201 || !response.body.data?.accessToken) {
        throw new Error(`Failed to register: ${JSON.stringify(response.body)}`);
      }

      accessToken = response.body.data.accessToken;
    });

    it('should return user info with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', userEmail);
          expect(res.body.data).toHaveProperty('name', 'Me User');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const uniqueEmail = `refresh-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: 'Refresh User',
        });

      if (response.status !== 201 || !response.body.data?.refreshToken) {
        throw new Error(`Failed to register: ${JSON.stringify(response.body)}`);
      }

      refreshToken = response.body.data.refreshToken;
    }, 10000); // Увеличиваем таймаут для beforeEach

    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.accessToken).not.toBe(refreshToken);
        });
    });

    it('should return 401 with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    let accessToken: string;

    beforeEach(async () => {
      const uniqueEmail = `logout-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      if (response.status !== 201 || !response.body.data?.accessToken) {
        throw new Error(`Failed to register: ${JSON.stringify(response.body)}`);
      }

      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('message');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});
