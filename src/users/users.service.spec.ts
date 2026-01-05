import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../database/entities/user.entity';

// Мокаем bcrypt модуль
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';

      const mockUser = {
        id: 'user-id',
        email,
        password: 'hashed-password',
        name,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.createUser(email, password, name);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(email);
    });

    it('should throw ConflictException if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      const existingUser = {
        id: 'existing-id',
        email,
        password: 'hashed',
      };

      mockRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.createUser(email, password)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        email,
        password: 'hashed-password',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user without password', async () => {
      const id = 'user-id';
      const mockUser = {
        id,
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(id);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).not.toHaveProperty('password');
      expect(result?.id).toBe(id);
    });

    it('should return null if user not found', async () => {
      const id = 'non-existent-id';

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed-password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const password = 'wrong-password';
      const hashedPassword = 'hashed-password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const id = 'user-id';
      const updateData = { name: 'Updated Name', avatar: 'avatar-url' };

      const updatedUser = {
        id,
        email: 'test@example.com',
        password: 'hashed',
        name: 'Updated Name',
        avatar: 'avatar-url',
      };

      mockRepository.update.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(id, updateData);

      expect(repository.update).toHaveBeenCalledWith(id, updateData);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe(updateData.name);
    });

    it('should throw NotFoundException if user not found', async () => {
      const id = 'non-existent-id';
      const updateData = { name: 'Updated Name' };

      mockRepository.update.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(id, updateData)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const id = 'user-id';
      const newPassword = 'new-password123';

      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockRepository.update.mockResolvedValue(undefined);

      await service.updatePassword(id, newPassword);

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(id, {
        password: 'new-hashed-password',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const id = 'user-id';

      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteUser(id);

      expect(repository.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('exists', () => {
    it('should return true if user exists', async () => {
      const id = 'user-id';

      mockRepository.count.mockResolvedValue(1);

      const result = await service.exists(id);

      expect(repository.count).toHaveBeenCalledWith({ where: { id } });
      expect(result).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const id = 'non-existent-id';

      mockRepository.count.mockResolvedValue(0);

      const result = await service.exists(id);

      expect(result).toBe(false);
    });
  });
});

