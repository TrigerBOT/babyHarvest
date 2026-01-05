import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';
import { AchievementsResponseDto } from './dto/achievements-response.dto';

@ApiTags('Достижения')
@Controller('v1/pregnancy/achievements')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@ApiBearerAuth()
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение всех достижений' })
  @ApiResponse({
    status: 200,
    description: 'Список всех достижений',
    type: AchievementsResponseDto,
  })
  async getAll(
    @Request() req: { user: { id: string } },
  ): Promise<AchievementsResponseDto> {
    return this.achievementsService.getAllAchievements(req.user.id);
  }
}

