import { type DataSource, type Repository, IsNull } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity.js';

export interface CreateRefreshTokenData {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

/** Data-access for persisted refresh tokens (rotation + revocation support). */
export class RefreshTokenRepository {
  private readonly repo: Repository<RefreshToken>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(RefreshToken);
  }

  create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.repo.save(this.repo.create({ ...data, revokedAt: null }));
  }

  /**
   * Returns the token row only if it exists and has not been revoked.
   * `IsNull()` is required — passing `revokedAt: undefined` would make TypeORM
   * silently drop the condition instead of generating `revokedAt IS NULL`.
   */
  findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash, revokedAt: IsNull() } });
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.repo.update({ tokenHash }, { revokedAt: new Date() });
  }

  /** Revoke every active token for a user (e.g. "log out everywhere"). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
