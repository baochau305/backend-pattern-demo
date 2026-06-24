import bcrypt from 'bcryptjs';
import type { User } from '../entities/user.entity.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
} from '../dtos/user.dto.js';
import type { PaginationParams } from '../../../shared/utils/pagination.js';
import { paginate } from '../../../shared/utils/pagination.js';
import type { PaginatedResult } from '../../../shared/http/api-response.js';
import {
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/api-error.js';

const SALT_ROUNDS = 10;

/**
 * User administration logic (admin-only surface). Always returns mapped DTOs so
 * sensitive columns never escape the service boundary.
 */
export class UserService {
  constructor(private readonly users: UserRepository) {}

  async list(params: PaginationParams): Promise<PaginatedResult<UserDto>> {
    const [items, total] = await this.users.findAndCount(params);
    return paginate(
      items.map((user) => this.toDto(user)),
      total,
      params,
    );
  }

  async getById(id: string): Promise<UserDto> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return this.toDto(user);
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing)
      throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name ?? null,
      role: dto.role,
    });
    return this.toDto(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    await this.getById(id); // 404 if missing
    const patch: Parameters<UserRepository['update']>[1] = {
      name: dto.name,
      role: dto.role,
    };
    if (dto.password)
      patch.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const updated = await this.users.update(id, patch);
    if (!updated) throw new NotFoundError('User not found');
    return this.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.users.softDelete(id);
    if (!deleted) throw new NotFoundError('User not found');
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
