import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePregnancyDaysTable1734567890001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pregnancy_days',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'day',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'week',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'trimester',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'baby_size',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'baby_weight',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'baby_development',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'mother_changes',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'tips',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'pregnancy_days',
      new TableIndex({
        name: 'idx_pregnancy_days_day',
        columnNames: ['day'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pregnancy_days');
  }
}

