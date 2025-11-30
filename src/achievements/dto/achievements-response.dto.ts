import { ApiProperty } from '@nestjs/swagger';

export class UnlockedAchievementDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'milestone' })
  type!: string;

  @ApiProperty({ example: 'week_12' })
  key!: string;

  @ApiProperty({ example: 'Первый триместр пройден!' })
  title!: string;

  @ApiProperty({ example: 'Вы завершили первый триместр беременности' })
  description!: string;

  @ApiProperty({ example: 'badge_triangle_1', required: false })
  icon?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  unlocked_at!: string;
}

export class LockedAchievementDto {
  @ApiProperty({ example: 'milestone' })
  type!: string;

  @ApiProperty({ example: 'week_20' })
  key!: string;

  @ApiProperty({ example: 'Половина пути' })
  title!: string;

  @ApiProperty({ example: 'Достигните 20 недель беременности' })
  description!: string;

  @ApiProperty({ example: 0.6 })
  progress!: number;

  @ApiProperty({ example: 95 })
  days_remaining!: number;
}

export class AchievementsResponseDto {
  @ApiProperty({ type: [UnlockedAchievementDto] })
  unlocked!: UnlockedAchievementDto[];

  @ApiProperty({ type: [LockedAchievementDto] })
  locked!: LockedAchievementDto[];

  @ApiProperty({ example: 3 })
  total_unlocked!: number;

  @ApiProperty({ example: 10 })
  total_available!: number;
}

