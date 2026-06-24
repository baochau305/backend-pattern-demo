import type { Category } from '../entities/category.entity.js';
import type { CategoryRepository } from '../repositories/category.repository.js';
import type {
  CategoryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dtos/category.dto.js';
import type { PaginationParams } from '../../../shared/utils/pagination.js';
import { paginate } from '../../../shared/utils/pagination.js';
import type { PaginatedResult } from '../../../shared/http/api-response.js';
import {
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/api-error.js';

export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  async list(params: PaginationParams): Promise<PaginatedResult<CategoryDto>> {
    const [items, total] = await this.categories.findAndCount(params);
    return paginate(
      items.map((category) => this.toDto(category)),
      total,
      params,
    );
  }

  async getById(id: string): Promise<CategoryDto> {
    return this.toDto(await this.getEntityOrThrow(id));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    const existing = await this.categories.findByName(dto.name);
    if (existing) throw new ConflictError('Category name already exists');
    const category = await this.categories.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.toDto(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    await this.getEntityOrThrow(id);
    if (dto.name) {
      const clash = await this.categories.findByName(dto.name);
      if (clash && clash.id !== id) {
        throw new ConflictError('Category name already exists');
      }
    }
    const updated = await this.categories.update(id, dto);
    if (!updated) throw new NotFoundError('Category not found');
    return this.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.categories.softDelete(id);
    if (!deleted) throw new NotFoundError('Category not found');
  }

  /** Shared lookup used by other services to validate a category reference. */
  async getEntityOrThrow(id: string): Promise<Category> {
    const category = await this.categories.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  private toDto(category: Category): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
