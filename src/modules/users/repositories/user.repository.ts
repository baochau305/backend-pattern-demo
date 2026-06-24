import type { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import type { Role } from '../../../shared/constants/roles.js';
import type { PaginationParams } from '../../../shared/utils/pagination.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: Role;
}

/**
 * Data-access layer for the User entity. The repository is the ONLY place that
 * knows about TypeORM/SQL for users; services depend on this class, never on the
 * ORM directly. The DataSource is injected so the same repository works against a
 * real connection in production and a mock in unit tests.
 */
export class UserRepository {
  private readonly repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  /**
   * Fetch a user including the `passwordHash` column, which is `select: false` and
   * therefore excluded from every other query. Used only by the login flow.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  create(data: CreateUserData): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async findAndCount(params: PaginationParams): Promise<[User[], number]> {
    return this.repo.findAndCount({
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    data: Partial<CreateUserData>,
  ): Promise<User | null> {
    await this.repo.update({ id }, data);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repo.softDelete({ id });
    return result.affected === 1;
  }
}
