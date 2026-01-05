import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor для трансформации ответов API в единый формат
 * Оборачивает все успешные ответы в { success: true, data: ... }
 * Исключает Swagger endpoints и пустые ответы (204 No Content)
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, { success: boolean; data: T } | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: boolean; data: T } | T> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Пропускаем Swagger endpoints
    if (request.url?.startsWith('/docs') || request.url?.startsWith('/docs-json')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Если статус 204 No Content или данные undefined/null, возвращаем как есть
        if (response.statusCode === HttpStatus.NO_CONTENT || data === undefined || data === null) {
          return data;
        }

        // Если данные уже обернуты в формат { success, data }, возвращаем как есть
        if (
          typeof data === 'object' &&
          data !== null &&
          'success' in data &&
          'data' in data &&
          Object.keys(data).length === 2
        ) {
          return data;
        }

        // Оборачиваем в единый формат
        return {
          success: true,
          data,
        };
      }),
    );
  }
}

