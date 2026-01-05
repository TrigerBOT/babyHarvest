import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Exception Filter для трансформации ошибок в единый формат
 * Возвращает ошибки в формате { success: false, error: { message, statusCode } }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        // Обрабатываем массив сообщений (валидация)
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
          details = { messages: responseObj.message };
        } else {
          message = responseObj.message || exception.message;
          // Исключаем message из details, так как он уже в корне error
          const { message: _, ...rest } = responseObj;
          if (Object.keys(rest).length > 0) {
            details = rest;
          }
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      error: {
        message,
        statusCode: status,
        ...(details && { details }),
      },
    });
  }
}

