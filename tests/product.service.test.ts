import { ProductService } from '../src/modules/products/services/product.service.js';
import { NotFoundError } from '../src/shared/errors/api-error.js';
import type { ProductRepository } from '../src/modules/products/repositories/product.repository.js';
import type { CategoryService } from '../src/modules/categories/services/category.service.js';
import type { CacheService } from '../src/shared/cache/cache.service.js';
import type { Product } from '../src/modules/products/entities/product.entity.js';
import type { ProductSearchParams } from '../src/modules/products/dtos/product.dto.js';

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'prod-1',
    name: 'Laptop',
    description: null,
    price: 1200,
    stock: 5,
    category: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as Product;

const baseParams: ProductSearchParams = {
  page: 1,
  limit: 10,
  sort: 'newest',
};

describe('ProductService', () => {
  let products: jest.Mocked<ProductRepository>;
  let categories: jest.Mocked<CategoryService>;
  let cache: jest.Mocked<CacheService>;
  let service: ProductService;

  beforeEach(() => {
    products = {
      findById: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    categories = {
      getEntityOrThrow: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    service = new ProductService(products, categories, cache);
  });

  describe('list (cache-aside)', () => {
    it('returns the cached value and skips the DB on a cache hit', async () => {
      const cached = {
        items: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      };
      cache.get.mockResolvedValue(cached);

      const result = await service.list(baseParams);

      expect(result).toBe(cached);
      expect(products.search).not.toHaveBeenCalled();
    });

    it('queries the DB and populates the cache on a miss', async () => {
      cache.get.mockResolvedValue(null);
      products.search.mockResolvedValue([[makeProduct()], 1]);

      const result = await service.list(baseParams);

      expect(products.search).toHaveBeenCalledWith(baseParams);
      expect(cache.set).toHaveBeenCalledTimes(1);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getById (cache-aside)', () => {
    it('throws NotFound when the product does not exist', async () => {
      cache.get.mockResolvedValue(null);
      products.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('maps the entity and caches it on a miss', async () => {
      cache.get.mockResolvedValue(null);
      products.findById.mockResolvedValue(makeProduct());

      const dto = await service.getById('prod-1');

      expect(dto.id).toBe('prod-1');
      expect(cache.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('validates the category and invalidates list caches', async () => {
      products.create.mockResolvedValue(makeProduct());

      await service.create({
        name: 'Laptop',
        price: 1200,
        stock: 5,
        categoryId: 'cat-1',
      });

      expect(categories.getEntityOrThrow).toHaveBeenCalledWith('cat-1');
      expect(cache.delByPattern).toHaveBeenCalledWith('products:list:*');
    });
  });

  describe('update', () => {
    it('throws NotFound when the product is missing', async () => {
      products.findById.mockResolvedValue(null);
      await expect(
        service.update('missing', { price: 10 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('invalidates both the detail key and list caches on success', async () => {
      products.findById.mockResolvedValue(makeProduct());
      products.update.mockResolvedValue(makeProduct({ price: 999 }));

      await service.update('prod-1', { price: 999 });

      expect(cache.del).toHaveBeenCalledWith('products:detail:prod-1');
      expect(cache.delByPattern).toHaveBeenCalledWith('products:list:*');
    });
  });

  describe('remove', () => {
    it('throws NotFound when nothing was deleted', async () => {
      products.softDelete.mockResolvedValue(false);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('soft-deletes and invalidates caches', async () => {
      products.softDelete.mockResolvedValue(true);
      await service.remove('prod-1');
      expect(cache.del).toHaveBeenCalledWith('products:detail:prod-1');
      expect(cache.delByPattern).toHaveBeenCalledWith('products:list:*');
    });
  });
});
