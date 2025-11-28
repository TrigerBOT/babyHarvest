import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Создание нового пользователя
   */
  async createUser(email: string, password: string, name?: string): Promise<Omit<User, 'password'>> {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Хешируем пароль
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создаем пользователя
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const savedUser = await this.userRepository.save(user);

    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  /**
   * Поиск пользователя по email (включая пароль для аутентификации)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Поиск пользователя по ID
   */
  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return null;
    }

    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Проверка пароля
   */
  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Обновление профиля пользователя
   */
  async updateProfile(id: string, data: { name?: string; avatar?: string }): Promise<Omit<User, 'password'>> {
    await this.userRepository.update(id, data);
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Обновление пароля
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(id, { password: hashedPassword });
  }

  /**
   * Удаление пользователя
   */
  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  /**
   * Проверка существования пользователя
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { id },
    });

    return count > 0;
  }
}
