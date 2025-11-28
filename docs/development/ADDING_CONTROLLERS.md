# Гайд по добавлению контроллеров

## Назначение документа

Этот документ описывает пошаговый процесс создания контроллеров в NestJS приложении, включая структуру, использование декораторов, валидацию, документацию и защиту роутов.

## Что такое контроллер?

Контроллер в NestJS отвечает за:
- Прием HTTP запросов
- Валидацию входных данных
- Вызов сервисов для обработки бизнес-логики
- Формирование HTTP ответов
- Документирование API через Swagger

## Структура контроллера

### Базовый шаблон

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ModuleService } from './module.service';
import { CreateDto } from './dto/create.dto';

@ApiTags('Module Name')
@Controller('module')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Создание ресурса' })
  @ApiResponse({ status: 201, description: 'Ресурс создан' })
  async create(@Body() createDto: CreateDto) {
    return this.moduleService.create(createDto);
  }
}
```

## Пошаговое создание контроллера

### Шаг 1: Создание файла контроллера

Создайте файл `module.controller.ts` в директории вашего модуля:

```typescript
import { Controller } from '@nestjs/common';

@Controller('module')
export class ModuleController {
  constructor() {}
}
```

### Шаг 2: Добавление декораторов

#### @Controller() - Определение базового пути

```typescript
@Controller('module')  // Все роуты будут начинаться с /module
export class ModuleController {}
```

#### @ApiTags() - Группировка в Swagger

```typescript
@ApiTags('Module Name')  // Группирует endpoints в Swagger UI
@Controller('module')
export class ModuleController {}
```

### Шаг 3: Добавление методов (endpoints)

#### GET запрос

```typescript
@Get()
@ApiOperation({ summary: 'Получение списка ресурсов' })
@ApiResponse({ status: 200, description: 'Список ресурсов' })
async findAll() {
  return this.moduleService.findAll();
}
```

#### GET с параметром

```typescript
@Get(':id')
@ApiOperation({ summary: 'Получение ресурса по ID' })
@ApiResponse({ status: 200, description: 'Ресурс найден' })
@ApiResponse({ status: 404, description: 'Ресурс не найден' })
async findOne(@Param('id') id: string) {
  return this.moduleService.findOne(id);
}
```

#### POST запрос

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Создание ресурса' })
@ApiBody({ type: CreateDto })
@ApiResponse({ status: 201, description: 'Ресурс создан', type: ResponseDto })
@ApiResponse({ status: 400, description: 'Некорректные данные' })
async create(@Body() createDto: CreateDto) {
  return this.moduleService.create(createDto);
}
```

#### PUT запрос

```typescript
@Put(':id')
@ApiOperation({ summary: 'Обновление ресурса' })
@ApiBody({ type: UpdateDto })
@ApiResponse({ status: 200, description: 'Ресурс обновлен' })
@ApiResponse({ status: 404, description: 'Ресурс не найден' })
async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
  return this.moduleService.update(id, updateDto);
}
```

#### DELETE запрос

```typescript
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Удаление ресурса' })
@ApiResponse({ status: 204, description: 'Ресурс удален' })
@ApiResponse({ status: 404, description: 'Ресурс не найден' })
async remove(@Param('id') id: string) {
  return this.moduleService.remove(id);
}
```

### Шаг 4: Внедрение сервиса

```typescript
@Controller('module')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}
  // Теперь можно использовать this.moduleService
}
```

### Шаг 5: Валидация данных через DTO

Создайте DTO для валидации:

```typescript
// dto/create.dto.ts
import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDto {
  @ApiProperty({ description: 'Название', example: 'Example' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ description: 'Email', example: 'user@example.com' })
  @IsEmail()
  email!: string;
}
```

Использование в контроллере:

```typescript
@Post()
async create(@Body() createDto: CreateDto) {
  // createDto автоматически валидируется
  return this.moduleService.create(createDto);
}
```

### Шаг 6: Защита роутов (Guards)

#### Использование JWT Guard

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Get('protected')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Защищенный endpoint' })
async getProtected(@Request() req) {
  // req.user содержит данные пользователя из JWT токена
  return { user: req.user };
}
```

#### Использование Rate Limiting

```typescript
import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('module')
@UseGuards(ThrottlerGuard)  // Применяется ко всем роутам контроллера
export class ModuleController {}
```

### Шаг 7: Документация Swagger

#### Базовые декораторы

```typescript
@ApiTags('Module Name')           // Группировка в Swagger
@ApiOperation({ summary: '...' }) // Описание операции
@ApiResponse({ ... })             // Описание ответа
@ApiBody({ type: Dto })           // Описание тела запроса
@ApiBearerAuth()                  // Указание на необходимость авторизации
@ApiParam({ name: 'id' })        // Описание параметра пути
@ApiQuery({ name: 'page' })       // Описание query параметра
```

#### Полный пример с документацией

```typescript
@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход в систему',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Неверный email или пароль',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
```

## Примеры из проекта

### Пример 1: AuthController

```typescript
@ApiTags('Авторизация')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение информации о текущем пользователе' })
  @ApiResponse({ status: 200, description: 'Информация о пользователе' })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  async getCurrentUser(@Request() req: { user: { id: string } }) {
    return this.authService.getCurrentUser(req.user.id);
  }
}
```

## CRUD контроллер (полный пример)

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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание нового элемента' })
  @ApiBody({ type: CreateItemDto })
  @ApiResponse({ status: 201, type: ItemResponseDto })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async create(@Body() createItemDto: CreateItemDto): Promise<ItemResponseDto> {
    return this.itemsService.create(createItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка элементов' })
  @ApiResponse({ status: 200, type: [ItemResponseDto] })
  async findAll(): Promise<ItemResponseDto[]> {
    return this.itemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение элемента по ID' })
  @ApiResponse({ status: 200, type: ItemResponseDto })
  @ApiResponse({ status: 404, description: 'Элемент не найден' })
  async findOne(@Param('id') id: string): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление элемента' })
  @ApiBody({ type: UpdateItemDto })
  @ApiResponse({ status: 200, type: ItemResponseDto })
  @ApiResponse({ status: 404, description: 'Элемент не найден' })
  async update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление элемента' })
  @ApiResponse({ status: 204, description: 'Элемент удален' })
  @ApiResponse({ status: 404, description: 'Элемент не найден' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.itemsService.remove(id);
  }
}
```

## Декораторы для параметров

### @Body() - Тело запроса

```typescript
@Post()
async create(@Body() createDto: CreateDto) {
  // Получение всего тела запроса
}

@Post()
async create(@Body('name') name: string) {
  // Получение конкретного поля
}
```

### @Param() - Параметры пути

```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  // Получение параметра из пути
}

@Get(':id/:subId')
async findNested(
  @Param('id') id: string,
  @Param('subId') subId: string,
) {
  // Несколько параметров
}

@Get(':id')
async findOne(@Param() params: { id: string }) {
  // Все параметры как объект
}
```

### @Query() - Query параметры

```typescript
@Get()
async findAll(@Query('page') page: number, @Query('limit') limit: number) {
  // Отдельные query параметры
}

@Get()
async findAll(@Query() query: { page?: number; limit?: number }) {
  // Все query параметры как объект
}
```

### @Request() / @Req() - Объект запроса

```typescript
@Get()
async getRequest(@Request() req) {
  // Полный объект запроса Express/Fastify
  // req.user - пользователь (после JWT guard)
  // req.headers - заголовки
  // req.body - тело запроса
}
```

### @Response() / @Res() - Объект ответа

```typescript
@Get()
async getResponse(@Response() res) {
  // Прямой доступ к объекту ответа
  // Используйте осторожно, лучше возвращать данные напрямую
  return res.status(200).json({ data: 'value' });
}
```

## HTTP статус коды

Используйте правильные HTTP статус коды:

```typescript
import { HttpCode, HttpStatus } from '@nestjs/common';

@Post()
@HttpCode(HttpStatus.CREATED)  // 201
async create() {}

@Delete()
@HttpCode(HttpStatus.NO_CONTENT)  // 204
async remove() {}

// По умолчанию:
// GET, PUT, PATCH - 200
// POST - 201
// DELETE - 200 (лучше использовать 204)
```

## Обработка ошибок

Ошибки обрабатываются автоматически через Exception Filters:

```typescript
// В сервисе
throw new NotFoundException('Ресурс не найден');
throw new BadRequestException('Некорректные данные');
throw new UnauthorizedException('Неавторизован');
throw new ForbiddenException('Доступ запрещен');
```

## Best Practices

1. **Один контроллер - одна сущность**: Каждый контроллер отвечает за одну сущность
2. **Минимальная логика**: Контроллер только обрабатывает HTTP, логика в сервисе
3. **Валидация через DTO**: Всегда используйте DTO для валидации
4. **Документация Swagger**: Документируйте все endpoints
5. **Правильные HTTP методы**: Используйте правильные методы (GET, POST, PUT, DELETE)
6. **Правильные статус коды**: Используйте правильные HTTP статус коды
7. **Защита роутов**: Используйте Guards для защиты роутов
8. **Типизация**: Всегда типизируйте параметры и возвращаемые значения

## Регистрация контроллера в модуле

Не забудьте зарегистрировать контроллер в модуле:

```typescript
@Module({
  controllers: [ModuleController],  // Регистрация контроллера
  providers: [ModuleService],
})
export class ModuleModule {}
```

## Связанные документы

- [MODULE_STRUCTURE.md](../architecture/MODULE_STRUCTURE.md) - Структура модулей
- [ADDING_FEATURES.md](./ADDING_FEATURES.md) - Гайд по внедрению фич
- [CODE_QUALITY.md](./CODE_QUALITY.md) - Чистота кода и типизация

