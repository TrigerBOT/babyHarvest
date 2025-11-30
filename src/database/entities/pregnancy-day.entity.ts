import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity('pregnancy_days')
@Index(['day'], { unique: true })
export class PregnancyDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer', unique: true })
  day!: number; // 1-280

  @Column({ type: 'integer' })
  week!: number;

  @Column({ type: 'integer' })
  trimester!: number; // 1-3

  @Column({ name: 'baby_size', type: 'varchar', length: 100 })
  babySize!: string;

  @Column({ name: 'baby_weight', type: 'varchar', length: 100 })
  babyWeight!: string;

  @Column({ name: 'baby_development', type: 'text' })
  babyDevelopment!: string;

  @Column({ name: 'mother_changes', type: 'text' })
  motherChanges!: string;

  @Column({ type: 'jsonb', nullable: true })
  tips?: string[];
}

