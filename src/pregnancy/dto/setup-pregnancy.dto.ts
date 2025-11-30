import { IsOptional, IsString, IsDateString, ValidateIf, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetupPregnancyDto {
  @ApiPropertyOptional({
    description: 'Дата начала беременности (последняя менструация)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => !o.due_date)
  @IsNotEmpty({ message: 'Either start_date or due_date is required' })
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Предполагаемая дата родов',
    example: '2024-10-08',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => !o.start_date)
  @IsNotEmpty({ message: 'Either start_date or due_date is required' })
  due_date?: string;
}

