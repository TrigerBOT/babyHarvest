import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from './entities/user.entity';
import { Pregnancy } from './entities/pregnancy.entity';
import { PregnancyDay } from './entities/pregnancy-day.entity';
import { Achievement } from './entities/achievement.entity';

config();

const configService = new ConfigService();

const databaseUrl = configService.get<string>('DATABASE_URL');

// Используем только один путь к миграциям, чтобы избежать дублирования
// typeorm-ts-node-commonjs может загружать .ts файлы напрямую
// В production нужно будет использовать скомпилированные .js файлы из dist
const dataSourceConfig: any = {
  type: 'postgres',
  entities: [User, Pregnancy, PregnancyDay, Achievement],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
};

if (databaseUrl) {
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    dataSourceConfig.url = databaseUrl;
  } else {
    const url = new URL(databaseUrl);
    dataSourceConfig.host = url.hostname;
    dataSourceConfig.port = parseInt(url.port) || 5432;
    dataSourceConfig.username = url.username;
    dataSourceConfig.password = url.password;
    dataSourceConfig.database = url.pathname.slice(1);
  }
} else {
  dataSourceConfig.host = configService.get<string>('DB_HOST', 'localhost');
  dataSourceConfig.port = configService.get<number>('DB_PORT', 5432);
  dataSourceConfig.username = configService.get<string>('DB_USERNAME', 'postgres');
  dataSourceConfig.password = configService.get<string>('DB_PASSWORD', 'postgres');
  dataSourceConfig.database = configService.get<string>('DB_NAME', 'postgres');
}

export default new DataSource(dataSourceConfig);

