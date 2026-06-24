import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../../shared/config/env.js';
import { Role } from '../../../shared/constants/roles.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../../../shared/errors/api-error.js';
import type { User } from '../../users/entities/user.entity.js';
import type { UserRepository } from '../../users/repositories/user.repository.js';
import type { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import type {
  AuthResultDto,
  AuthUserDto,
  LoginDto,
  RegisterDto,
  TokenPairDto,
} from '../dtos/auth.dto.js';
import type { AccessTokenPayload } from '../../../shared/middlewares/auth.middleware.js';

const SALT_ROUNDS = 10;

interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  // Unique token id: guarantees two refresh tokens are never byte-identical (and
  // thus never collide on the unique tokenHash) even when signed in the same second.
  jti: string;
}

/**
 * Authentication & session logic.
 *
 * Security properties implemented here:
 *   - Passwords are bcrypt-hashed (never stored or logged in plaintext).
 *   - Short-lived access tokens carry the role for stateless authorization.
 *   - Refresh tokens are persisted only as SHA-256 hashes.
 *   - Rotation: every refresh revokes the presented token and issues a new pair.
 *   - Reuse detection: presenting a valid-but-already-rotated token revokes the
 *     whole family, defending against stolen-token replay.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async register(dto: RegisterDto): Promise<AuthUserDto> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name ?? null,
      role: Role.USER,
    });
    return this.toAuthUser(user);
  }

  async login(dto: LoginDto): Promise<AuthResultDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    // Compare even on missing user is unnecessary here, but we keep the failure
    // path uniform: any credential mismatch yields the same opaque 401.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toAuthUser(user) };
  }

  /**
   * Exchange a valid refresh token for a fresh pair, rotating (revoking) the old one.
   */
  async refresh(rawToken: string): Promise<TokenPairDto> {
    const payload = this.verifyRefreshToken(rawToken);
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokens.findActiveByHash(tokenHash);

    if (!stored) {
      // The signature is valid but the token is not active: it was already rotated
      // or revoked. Treat as compromise and revoke the user's whole token family.
      await this.refreshTokens.revokeAllForUser(payload.sub);
      throw new UnauthorizedError('Refresh token has been revoked');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedError();

    await this.refreshTokens.revokeByHash(tokenHash); // rotation
    return this.issueTokens(user);
  }

  async logout(rawToken: string): Promise<void> {
    // Idempotent: revoking an unknown/already-revoked token is a no-op.
    await this.refreshTokens.revokeByHash(this.hashToken(rawToken));
  }

  // --- private helpers -----------------------------------------------------

  private async issueTokens(user: User): Promise<TokenPairDto> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id);

    const decoded = jwt.decode(refreshToken) as { exp: number };
    await this.refreshTokens.create({
      tokenHash: this.hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(decoded.exp * 1000),
    });

    return { accessToken, refreshToken };
  }

  private signAccessToken(user: User): string {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  private signRefreshToken(userId: string): string {
    const payload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
      jti: randomUUID(),
    };
    const options: SignOptions = {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  private verifyRefreshToken(rawToken: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(
        rawToken,
        env.JWT_SECRET,
      ) as RefreshTokenPayload;
      if (payload.type !== 'refresh') throw new Error('Wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /** SHA-256 is sufficient (and fast) for high-entropy tokens; bcrypt is reserved for passwords. */
  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toAuthUser(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
