import { productRepo } from '../repositories/product.repository.js';
import { cacheGet, cacheSet, cacheDel } from '../../../shared/cache/cache.js';

const listKey = (q: string) => `products:list:${q}`;
const detailKey = (id: string) => `products:detail:${id}`;

export const productService = {
  list: async (query: Record<string, string>) => {
    const key = listKey(JSON.stringify(query));
    const cached = await cacheGet<unknown[]>(key);
    if (cached) return cached;

    const qb = productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c');
    if (query.search)
      qb.andWhere('p.name ILIKE :s', { s: `%${query.search}%` });
    if (query.category) qb.andWhere('c.id = :c', { c: query.category });
    if (query.sort === 'price_desc') qb.orderBy('p.price', 'DESC');
    const data = await qb.getMany();

    // Cache-aside: cache miss -> DB -> save to Redis with TTL.
    await cacheSet(key, data, 60);
    return data;
  },

  get: async (id: string) => {
    const key = detailKey(id);
    const cached = await cacheGet<unknown>(key);
    if (cached) return cached;
    const data = await productRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (data) await cacheSet(key, data, 120);
    return data;
  },

  create: async (
    payload: Partial<{ name: string; price: number; stock: number }>,
  ) => {
    const created = await productRepo.save(productRepo.create(payload));
    await cacheDel('products:list:*');
    return created;
  },
};
