import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PregnancyDayResponseDto } from './pregnancy-day-response.dto';

export class AchievementDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'milestone' })
  type!: string;

  @ApiProperty({ example: 'week_6' })
  key!: string;

  @ApiProperty({ example: 'Первые недели' })
  title!: string;

  @ApiProperty({ example: 'Вы достигли 6 недель беременности' })
  description!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  unlocked_at!: string;
}

export class TodayDataResponseDto extends PregnancyDayResponseDto {
  @ApiPropertyOptional({ type: [AchievementDto] })
  new_achievements?: AchievementDto[];
}

