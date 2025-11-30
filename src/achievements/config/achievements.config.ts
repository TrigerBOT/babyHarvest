export interface AchievementConfig {
  key: string;
  type: 'milestone' | 'special';
  week?: number;
  day?: number;
  title: string;
  description?: string;
  icon?: string;
}

export const ACHIEVEMENTS_CONFIG: AchievementConfig[] = [
  { key: 'week_4', type: 'milestone', week: 4, title: 'Первые недели', description: 'Вы достигли 4 недель беременности' },
  { key: 'week_8', type: 'milestone', week: 8, title: 'Первый месяц', description: 'Вы достигли 8 недель беременности' },
  { key: 'week_12', type: 'milestone', week: 12, title: 'Первый триместр', description: 'Вы завершили первый триместр беременности' },
  { key: 'week_16', type: 'milestone', week: 16, title: '16 недель', description: 'Вы достигли 16 недель беременности' },
  { key: 'week_20', type: 'milestone', week: 20, title: 'Половина пути', description: 'Вы достигли 20 недель беременности' },
  { key: 'week_24', type: 'milestone', week: 24, title: '24 недели', description: 'Вы достигли 24 недель беременности' },
  { key: 'week_28', type: 'milestone', week: 28, title: 'Третий триместр', description: 'Вы достигли 28 недель беременности' },
  { key: 'week_32', type: 'milestone', week: 32, title: '32 недели', description: 'Вы достигли 32 недель беременности' },
  { key: 'week_36', type: 'milestone', week: 36, title: 'Финишная прямая', description: 'Вы достигли 36 недель беременности' },
  { key: 'week_40', type: 'milestone', week: 40, title: 'До встречи!', description: 'Вы достигли 40 недель беременности' },
  { key: 'day_100', type: 'special', day: 100, title: '100 дней беременности', description: 'Вы прошли 100 дней беременности' },
  { key: 'day_200', type: 'special', day: 200, title: '200 дней беременности', description: 'Вы прошли 200 дней беременности' },
];

