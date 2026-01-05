import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Pregnancy } from './entities/pregnancy.entity';
import { PregnancyDay } from './entities/pregnancy-day.entity';
import { Achievement } from './entities/achievement.entity';
import { PregnancyDataImporterService } from './services/pregnancy-data-importer.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        // Парсим DATABASE_URL если он в формате postgresql://
        const config: any = {
          type: 'postgres',
          entities: [User, Pregnancy, PregnancyDay, Achievement],
          synchronize: false, // Отключаем synchronize, используем только миграции
          logging: configService.get<string>('NODE_ENV') === 'development',
        };

        if (databaseUrl) {
          // Если URL в формате postgresql://, используем его напрямую
          if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
            config.url = databaseUrl;
          } else {
            // Иначе парсим компоненты
            const url = new URL(databaseUrl);
            config.host = url.hostname;
            config.port = parseInt(url.port) || 5432;
            config.username = url.username;
            config.password = url.password;
            config.database = url.pathname.slice(1);
          }
        }

        return config;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Pregnancy, PregnancyDay, Achievement]),
  ],
  providers: [PregnancyDataImporterService],
  exports: [TypeOrmModule, PregnancyDataImporterService],
})
export class DatabaseModule {}

