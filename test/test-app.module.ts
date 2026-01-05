import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Тестовый ThrottlerGuard, который всегда разрешает запросы
 * Используется в e2e тестах для отключения rate limiting
 */
@Injectable()
export class TestThrottlerGuard extends ThrottlerGuard {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // Всегда разрешаем запросы в тестах
    return true;
  }
}

