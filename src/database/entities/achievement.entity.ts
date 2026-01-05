import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum AchievementType {
  MILESTONE = 'milestone',
  SPECIAL = 'special',
}

@Entity('achievements')
@Index(['userId'])
@Index(['userId', 'achievementType', 'achievementKey'], { unique: true })
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    name: 'achievement_type',
    type: 'varchar',
    length: 20,
    enum: AchievementType,
  })
  achievementType!: AchievementType;

  @Column({ name: 'achievement_key', type: 'varchar', length: 100 })
  achievementKey!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon?: string;

  @Column({ name: 'unlocked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  unlockedAt!: Date;
}

