import type { Product } from '../entities/product.entity.js';
import type { ProductRepository } from '../repositories/product.repository.js';
import type { CategoryService } from '../../categories/services/category.service.js';
import type { CacheService } from '../../../shared/cache/cache.service.js';
import { env } from '../../../shared/config/env.js';
import { NotFoundError } from '../../../shared/errors/api-error.js';
import { paginate } from '../../../shared/utils/pagination.js';
import type { PaginatedResult } from '../../../shared/http/api-response.js';
import type {
  CreateProductDto,
  ProductDto,
  ProductSearchParams,
  UpdateProductDto,
} from '../dtos/product.dto.js';

const LIST_PREFIX = 'products:list:';
const detailKey = (id: string): string => `products:detail:${id}`;

/**
 * Product business logic with a Redis cache-aside layer.
 *
 * Read path (cache-aside):
 *   1. Build a deterministic cache key from the query.
 *   2. Return the cached value on hit.
 *   3. On miss, read from the DB, populate the cache with a TTL, and return.
 *
 * Write path: every create/update/delete invalidates the affected cache entries
 * so clients never see stale data — list keys are cleared by pattern (SCAN) and
 * the specific detail key is removed. TTLs are a safety net for anything missed.
 */
export class ProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryService,
    private readonly cache: CacheService,
  ) {}

  async list(
    params: ProductSearchParams,
  ): Promise<PaginatedResult<ProductDto>> {
    const key = `${LIST_PREFIX}${JSON.stringify(params)}`;
    const cached = await this.cache.get<PaginatedResult<ProductDto>>(key);
    if (cached) return cached;

    const [items, total] = await this.products.search(params);
    const result = paginate(
      items.map((product) => this.toDto(product)),
      total,
      params,
    );

    await this.cache.set(key, result, env.CACHE_TTL_LIST_SEC);
    return result;
  }

  async getById(id: string): Promise<ProductDto> {
    const key = detailKey(id);
    const cached = await this.cache.get<ProductDto>(key);
    if (cached) return cached;

    const product = await this.products.findById(id);
    if (!product) throw new NotFoundError('Product not found');

    const dto = this.toDto(product);
    await this.cache.set(key, dto, env.CACHE_TTL_DETAIL_SEC);
    return dto;
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    if (dto.categoryId) await this.categories.getEntityOrThrow(dto.categoryId);
    const created = await this.products.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId ?? null,
    });
    await this.invalidateLists();
    // Reload so the response includes the populated category relation.
    const product = (await this.products.findById(created.id)) ?? created;
    return this.toDto(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    await this.getEntityOrThrow(id);
    if (dto.categoryId) await this.categories.getEntityOrThrow(dto.categoryId);

    const updated = await this.products.update(id, dto);
    if (!updated) throw new NotFoundError('Product not found');

    await Promise.all([this.cache.del(detailKey(id)), this.invalidateLists()]);
    return this.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.products.softDelete(id);
    if (!deleted) throw new NotFoundError('Product not found');
    await Promise.all([this.cache.del(detailKey(id)), this.invalidateLists()]);
  }

  private async getEntityOrThrow(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  private async invalidateLists(): Promise<void> {
    await this.cache.delByPattern(`${LIST_PREFIX}*`);
  }

  private toDto(product: Product): ProductDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category
        ? { id: product.category.id, name: product.category.name }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
