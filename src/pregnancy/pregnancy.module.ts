import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pregnancy } from '../database/entities/pregnancy.entity';
import { PregnancyDay } from '../database/entities/pregnancy-day.entity';
import { PregnancyService } from './pregnancy.service';
import { PregnancyController } from './pregnancy.controller';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pregnancy, PregnancyDay]),
    forwardRef(() => AchievementsModule),
  ],
  controllers: [PregnancyController],
  providers: [PregnancyService],
  exports: [PregnancyService],
})
export class PregnancyModule {}

