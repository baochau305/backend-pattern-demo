import type { DataSource, Repository } from 'typeorm';
import { Category } from '../entities/category.entity.js';
import type { PaginationParams } from '../../../shared/utils/pagination.js';

export interface CategoryData {
  name: string;
  description?: string | null;
}

export class CategoryRepository {
  private readonly repo: Repository<Category>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Category);
  }

  findById(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Category | null> {
    return this.repo.findOne({ where: { name } });
  }

  findAndCount(params: PaginationParams): Promise<[Category[], number]> {
    return this.repo.findAndCount({
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      order: { name: 'ASC' },
    });
  }

  create(data: CategoryData): Promise<Category> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: string,
    data: Partial<CategoryData>,
  ): Promise<Category | null> {
    await this.repo.update({ id }, data);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repo.softDelete({ id });
    return result.affected === 1;
  }
}
