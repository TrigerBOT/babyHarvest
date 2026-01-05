import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PregnancyService } from './pregnancy.service';
import { SetupPregnancyDto } from './dto/setup-pregnancy.dto';
import { TodayDataResponseDto } from './dto/today-data-response.dto';
import { PregnancyDayResponseDto } from './dto/pregnancy-day-response.dto';

@ApiTags('Беременность')
@Controller('v1/pregnancy')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@ApiBearerAuth()
export class PregnancyController {
  constructor(private readonly pregnancyService: PregnancyService) {}

  @Get('today')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение данных на текущий день' })
  @ApiResponse({
    status: 200,
    description: 'Данные на текущий день',
    type: TodayDataResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Данные о беременности не найдены',
  })
  async getToday(
    @Request() req: { user: { id: string } },
  ): Promise<TodayDataResponseDto> {
    return this.pregnancyService.getTodayData(req.user.id);
  }

  @Get('day/:day')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение данных на конкретный день' })
  @ApiParam({
    name: 'day',
    type: Number,
    description: 'День беременности (1-280)',
    example: 45,
  })
  @ApiResponse({
    status: 200,
    description: 'Данные на указанный день',
    type: PregnancyDayResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Невалидный день',
  })
  async getDay(
    @Param('day', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    day: number,
    @Request() req: { user: { id: string } },
  ): Promise<PregnancyDayResponseDto> {
    // Валидация диапазона
    if (day < 1 || day > 280) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Day must be between 1 and 280',
        details: {
          day: 'Day must be between 1 and 280',
        },
      });
    }

    // Проверка, что день не в будущем
    const pregnancy = await this.pregnancyService.getPregnancyByUserId(req.user.id);
    if (pregnancy) {
      const currentDay = this.pregnancyService.calculateCurrentDay(
        pregnancy.startDate || undefined,
        pregnancy.dueDate || undefined,
      );
      if (day > currentDay) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Cannot access future days',
          details: {
            day: 'Day cannot be greater than current day',
          },
        });
      }
    }

    return this.pregnancyService.getDayDataResponse(day);
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Настройка беременности' })
  @ApiResponse({
    status: 200,
    description: 'Беременность успешно настроена',
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные',
  })
  async setup(
    @Body() dto: SetupPregnancyDto,
    @Request() req: { user: { id: string } },
  ): Promise<{
    id: string;
    start_date: string | undefined;
    due_date: string | undefined;
    current_day: number;
    created_at: string;
  }> {
    try {
      const pregnancy = await this.pregnancyService.setupPregnancy(req.user.id, dto);
      const currentDay = this.pregnancyService.calculateCurrentDay(
        pregnancy.startDate,
        pregnancy.dueDate,
      );

      return {
        id: pregnancy.id,
        start_date: pregnancy.startDate?.toISOString().split('T')[0],
        due_date: pregnancy.dueDate?.toISOString().split('T')[0],
        current_day: currentDay,
        created_at: pregnancy.createdAt.toISOString(),
      };
    } catch (error: any) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid pregnancy data',
      });
    }
  }
}

