# Гайд по внедрению новых фич

## Назначение документа

Этот документ описывает пошаговый процесс создания новых фич в NestJS приложении, включая создание модулей, работу с базой данных, миграции и интеграцию с существующими модулями.

## Общий процесс

При добавлении новой фичи обычно выполняется следующая последовательность:

1. Создание Entity (сущности базы данных)
2. Создание миграции
3. Создание модуля (module, service, controller)
4. Создание DTO
5. Регистрация модуля в AppModule
6. Тестирование

## Пример: Создание модуля "Transactions"

В этом примере мы создадим модуль для управления транзакциями (доходами и расходами).

### Шаг 1: Создание Entity

Создайте файл `src/database/entities/transaction.entity.ts`:

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column()
  description!: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

**Важные моменты**:
- Используйте `@PrimaryGeneratedColumn('uuid')` для UUID
- Используйте `@CreateDateColumn()` и `@UpdateDateColumn()` для временных меток
- Используйте `@ManyToOne()` для связей с другими сущностями
- Используйте `enum` для ограниченного набора значений

### Шаг 2: Создание миграции

Создайте миграцию для новой таблицы:

```bash
npm run migration:generate -- -n CreateTransactionsTable
```

Или создайте вручную файл `src/database/migrations/XXXXXX-CreateTransactionsTable.ts`:

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTransactionsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['income', 'expense'],
          },
          {
            name: 'description',
            type: 'varchar',
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['userId'],
          },
          {
            columnNames: ['type'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions');
  }
}
```

Примените миграцию:

```bash
npm run migration:run
```

### Шаг 3: Обновление DatabaseModule

Добавьте новую Entity в `src/database/database.module.ts`:

```typescript
import { Transaction } from './entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // ...
      entities: [User, Transaction],  // Добавьте Transaction
    }),
    TypeOrmModule.forFeature([User, Transaction]),  // Добавьте Transaction
  ],
})
export class DatabaseModule {}
```

### Шаг 4: Создание DTO

Создайте DTO для валидации данных:

**`src/transactions/dto/create-transaction.dto.ts`**:
```typescript
import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../database/entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Сумма транзакции', example: 1000.50 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ 
    description: 'Тип транзакции', 
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ description: 'Описание транзакции', example: 'Покупка продуктов' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Категория', example: 'Продукты', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
```

**`src/transactions/dto/update-transaction.dto.ts`**:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
```

**`src/transactions/dto/transaction-response.dto.ts`**:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../database/entities/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: TransactionType })
  type!: TransactionType;

  @ApiProperty()
  description!: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

### Шаг 5: Создание Service

Создайте файл `src/transactions/transactions.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async create(userId: string, createDto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...createDto,
      userId,
    });
    return this.transactionRepository.save(transaction);
  }

  async findAll(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой транзакции');
    }

    return transaction;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);
    Object.assign(transaction, updateDto);
    return this.transactionRepository.save(transaction);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);
    await this.transactionRepository.remove(transaction);
  }

  async getBalance(userId: string): Promise<{ income: number; expense: number; balance: number }> {
    const transactions = await this.transactionRepository.find({
      where: { userId },
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  }
}
```

### Шаг 6: Создание Controller

Создайте файл `src/transactions/transactions.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Транзакции')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание транзакции' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  async create(
    @Request() req: { user: { id: string } },
    @Body() createDto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.create(req.user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка транзакций' })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async findAll(@Request() req: { user: { id: string } }): Promise<TransactionResponseDto[]> {
    return this.transactionsService.findAll(req.user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Получение баланса' })
  @ApiResponse({ status: 200, description: 'Баланс пользователя' })
  async getBalance(@Request() req: { user: { id: string } }) {
    return this.transactionsService.getBalance(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение транзакции по ID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Транзакция не найдена' })
  async findOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление транзакции' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление транзакции' })
  @ApiResponse({ status: 204, description: 'Транзакция удалена' })
  async remove(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<void> {
    return this.transactionsService.remove(id, req.user.id);
  }
}
```

### Шаг 7: Создание Module

Создайте файл `src/transactions/transactions.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../database/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
```

### Шаг 8: Регистрация в AppModule

Добавьте новый модуль в `src/app.module.ts`:

```typescript
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    // ... существующие модули
    TransactionsModule,  // Добавьте новый модуль
  ],
})
export class AppModule {}
```

## Работа с базой данных

### Типы колонок TypeORM

```typescript
@Column('varchar', { length: 255 })
name!: string;

@Column('text')
description!: string;

@Column('int')
count!: number;

@Column('decimal', { precision: 10, scale: 2 })
price!: number;

@Column('boolean', { default: false })
isActive!: boolean;

@Column('json')
metadata!: object;

@Column('date')
birthDate!: Date;

@Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
createdAt!: Date;
```

### Связи между сущностями

#### One-to-Many / Many-to-One

```typescript
// Transaction Entity
@ManyToOne(() => User)
@JoinColumn({ name: 'userId' })
user!: User;

// User Entity
@OneToMany(() => Transaction, transaction => transaction.user)
transactions!: Transaction[];
```

#### Many-to-Many

```typescript
@ManyToMany(() => Category)
@JoinTable()
categories!: Category[];
```

### Запросы к базе данных

```typescript
// Простой поиск
const user = await this.repository.findOne({ where: { id } });

// Поиск с условиями
const transactions = await this.repository.find({
  where: { userId, type: TransactionType.EXPENSE },
  order: { createdAt: 'DESC' },
  take: 10,
  skip: 0,
});

// Поиск с отношениями
const user = await this.repository.findOne({
  where: { id },
  relations: ['transactions'],
});

// Создание
const entity = this.repository.create(data);
await this.repository.save(entity);

// Обновление
await this.repository.update(id, data);

// Удаление
await this.repository.delete(id);
```

## Интеграция с существующими модулями

### Использование сервисов других модулей

```typescript
// В TransactionsModule
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [UsersModule],  // Импортируем модуль
  providers: [TransactionsService],
})
export class TransactionsModule {}

// В TransactionsService
@Injectable()
export class TransactionsService {
  constructor(
    private usersService: UsersService,  // Используем сервис
  ) {}
}
```

**Важно**: Модуль должен экспортировать сервис, чтобы его можно было использовать:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],  // Экспорт для использования в других модулях
})
export class UsersModule {}
```

## Миграции

### Генерация миграции

```bash
npm run migration:generate -- -n MigrationName
```

### Применение миграций

```bash
npm run migration:run
```

### Откат миграции

```bash
npm run migration:revert
```

### Создание пустой миграции

```bash
npm run migration:create -- -n MigrationName
```

## Best Practices

1. **Именование**: Используйте понятные имена для модулей, сервисов, контроллеров
2. **Структура**: Следуйте единой структуре модулей
3. **Валидация**: Всегда валидируйте входные данные через DTO
4. **Безопасность**: Проверяйте права доступа (пользователь может изменять только свои данные)
5. **Ошибки**: Используйте правильные исключения NestJS
6. **Типизация**: Всегда типизируйте данные
7. **Документация**: Документируйте API через Swagger
8. **Тестирование**: Пишите тесты для новой функциональности

## Чек-лист при добавлении новой фичи

- [ ] Создана Entity
- [ ] Создана и применена миграция
- [ ] Entity добавлена в DatabaseModule
- [ ] Созданы DTO (create, update, response)
- [ ] Создан Service с бизнес-логикой
- [ ] Создан Controller с endpoints
- [ ] Создан Module
- [ ] Module зарегистрирован в AppModule
- [ ] Добавлена документация Swagger
- [ ] Добавлена защита роутов (Guards)
- [ ] Написаны тесты
- [ ] Проверена работа через Postman/Swagger

## Связанные документы

- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - Общая архитектура
- [MODULE_STRUCTURE.md](../architecture/MODULE_STRUCTURE.md) - Структура модулей
- [ADDING_CONTROLLERS.md](./ADDING_CONTROLLERS.md) - Гайд по контроллерам
- [CODE_QUALITY.md](./CODE_QUALITY.md) - Чистота кода

