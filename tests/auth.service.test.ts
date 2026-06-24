import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/modules/auth/services/auth.service.js';
import { Role } from '../src/shared/constants/roles.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../src/shared/errors/api-error.js';
import type { UserRepository } from '../src/modules/users/repositories/user.repository.js';
import type { RefreshTokenRepository } from '../src/modules/auth/repositories/refresh-token.repository.js';
import type { User } from '../src/modules/users/entities/user.entity.js';

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane',
    role: Role.USER,
    passwordHash: 'hash',
    ...overrides,
  }) as User;

describe('AuthService', () => {
  let users: jest.Mocked<UserRepository>;
  let refreshTokens: jest.Mocked<RefreshTokenRepository>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    refreshTokens = {
      create: jest.fn(),
      findActiveByHash: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllForUser: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenRepository>;

    service = new AuthService(users, refreshTokens);
  });

  describe('register', () => {
    it('hashes the password and returns a safe user (no hash leaked)', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation(async (data) =>
        makeUser({ email: data.email, name: data.name, role: data.role }),
      );

      const result = await service.register({
        email: 'jane@example.com',
        password: 'Password1',
        name: 'Jane',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'jane@example.com',
        name: 'Jane',
        role: Role.USER,
      });
      expect(result).not.toHaveProperty('passwordHash');

      const createArg = users.create.mock.calls[0][0];
      expect(createArg.passwordHash).not.toBe('Password1');
      await expect(
        bcrypt.compare('Password1', createArg.passwordHash),
      ).resolves.toBe(true);
    });

    it('rejects a duplicate email with ConflictError', async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      await expect(
        service.register({ email: 'jane@example.com', password: 'Password1' }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues tokens and persists a hashed refresh token on success', async () => {
      const passwordHash = await bcrypt.hash('Password1', 10);
      users.findByEmailWithPassword.mockResolvedValue(
        makeUser({ passwordHash }),
      );

      const result = await service.login({
        email: 'jane@example.com',
        password: 'Password1',
      });

      expect(result.user.id).toBe('user-1');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');

      // Refresh token is stored only as a SHA-256 hash, never raw.
      expect(refreshTokens.create).toHaveBeenCalledTimes(1);
      const stored = refreshTokens.create.mock.calls[0][0];
      expect(stored.tokenHash).toBe(sha256(result.refreshToken));
      expect(stored.tokenHash).not.toBe(result.refreshToken);
      expect(stored.userId).toBe('user-1');
      expect(stored.expiresAt).toBeInstanceOf(Date);
    });

    it('issues a unique refresh token each time (no tokenHash collision)', async () => {
      const passwordHash = await bcrypt.hash('Password1', 10);
      users.findByEmailWithPassword.mockResolvedValue(
        makeUser({ passwordHash }),
      );

      const first = await service.login({
        email: 'jane@example.com',
        password: 'Password1',
      });
      const second = await service.login({
        email: 'jane@example.com',
        password: 'Password1',
      });

      // Without a per-token jti, two tokens signed in the same second would be
      // byte-identical and collide on the unique tokenHash index.
      expect(first.refreshToken).not.toBe(second.refreshToken);
      expect(refreshTokens.create.mock.calls[0][0].tokenHash).not.toBe(
        refreshTokens.create.mock.calls[1][0].tokenHash,
      );
    });

    it('rejects an invalid password', async () => {
      const passwordHash = await bcrypt.hash('Password1', 10);
      users.findByEmailWithPassword.mockResolvedValue(
        makeUser({ passwordHash }),
      );
      await expect(
        service.login({ email: 'jane@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('rejects an unknown user', async () => {
      users.findByEmailWithPassword.mockResolvedValue(null);
      await expect(
        service.login({ email: 'ghost@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('refresh', () => {
    const signRefresh = (sub = 'user-1'): string =>
      jwt.sign({ sub, type: 'refresh' }, process.env.JWT_SECRET ?? 'change_me');

    it('rotates the token: revokes the old one and issues a new pair', async () => {
      const raw = signRefresh();
      refreshTokens.findActiveByHash.mockResolvedValue({
        tokenHash: sha256(raw),
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      } as never);
      users.findById.mockResolvedValue(makeUser());

      const result = await service.refresh(raw);

      expect(refreshTokens.revokeByHash).toHaveBeenCalledWith(sha256(raw));
      expect(refreshTokens.create).toHaveBeenCalledTimes(1);
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('detects reuse of an inactive token and revokes the whole family', async () => {
      const raw = signRefresh();
      refreshTokens.findActiveByHash.mockResolvedValue(null);

      await expect(service.refresh(raw)).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects a malformed/forged token', async () => {
      await expect(service.refresh('not-a-jwt')).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });
  });

  describe('logout', () => {
    it('revokes the presented refresh token by its hash', async () => {
      await service.logout('some-token');
      expect(refreshTokens.revokeByHash).toHaveBeenCalledWith(
        sha256('some-token'),
      );
    });
  });
});
