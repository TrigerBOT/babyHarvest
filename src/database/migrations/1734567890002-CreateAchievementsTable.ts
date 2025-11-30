import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAchievementsTable1734567890002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'achievements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'achievement_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'achievement_key',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'unlocked_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'achievements',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'achievements',
      new TableIndex({
        name: 'idx_achievements_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'achievements',
      new TableIndex({
        name: 'idx_achievements_user_type_key',
        columnNames: ['user_id', 'achievement_type', 'achievement_key'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('achievements');
  }
}

