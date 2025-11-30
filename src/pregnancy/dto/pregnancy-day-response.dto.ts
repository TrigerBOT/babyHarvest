import { ApiProperty } from '@nestjs/swagger';

export class BabyInfoDto {
  @ApiProperty({ example: '4-5 мм' })
  size!: string;

  @ApiProperty({ example: '0.5 г' })
  weight!: string;

  @ApiProperty({ example: 'Формируются зачатки рук и ног, начинает биться сердце.' })
  development!: string;
}

export class MotherInfoDto {
  @ApiProperty({ example: 'Возможны утренняя тошнота, усталость, изменения настроения' })
  changes!: string;
}

export class PregnancyDayResponseDto {
  @ApiProperty({ example: 45 })
  day!: number;

  @ApiProperty({ example: 6 })
  week!: number;

  @ApiProperty({ example: 1 })
  trimester!: number;

  @ApiProperty({ type: BabyInfoDto })
  baby!: BabyInfoDto;

  @ApiProperty({ type: MotherInfoDto })
  mother!: MotherInfoDto;

  @ApiProperty({ example: ['Пейте больше воды', 'Отдыхайте при усталости'] })
  tips!: string[];

  @ApiProperty({ example: '/images/embryo/week-6.jpg' })
  image_url!: string;
}

