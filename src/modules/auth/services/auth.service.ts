import bcrypt from 'bcryptjs';
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { authRepo } from '../repositories/auth.repository.js';
import {
  BadRequestError,
  UnauthorizedError,
} from '../../../shared/errors/api-error.js';

const SALT_ROUNDS = 10;
const jwtSecret = process.env.JWT_SECRET as Secret;
const accessExpiresIn = (process.env.JWT_EXPIRES_IN ??
  '15m') as SignOptions['expiresIn'];
const refreshExpiresIn = (process.env.REFRESH_TOKEN_EXPIRES_IN ??
  '7d') as SignOptions['expiresIn'];
const accessOptions: SignOptions = { expiresIn: accessExpiresIn };
const refreshOptions: SignOptions = { expiresIn: refreshExpiresIn };

const signAccess = (sub: string, role: 'ADMIN' | 'USER') =>
  jwt.sign({ sub, role }, jwtSecret, accessOptions);

export const authService = {
  register: async (email: string, password: string) => {
    const exists = await authRepo.userRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestError('Email already used');
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = authRepo.userRepo.create({
      email,
      passwordHash,
      role: 'USER',
    });
    await authRepo.userRepo.save(user);
    return { id: user.id, email: user.email };
  },

  login: async (email: string, password: string) => {
    const user = await authRepo.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedError();
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError();

    const accessToken = signAccess(user.id, user.role);
    const refreshToken = jwt.sign({ sub: user.id }, jwtSecret, refreshOptions);

    await authRepo.refreshRepo.save(
      authRepo.refreshRepo.create({ token: refreshToken, user }),
    );
    return { accessToken, refreshToken };
  },

  refresh: async (token: string) => {
    const record = await authRepo.refreshRepo.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!record) throw new UnauthorizedError();
    await authRepo.refreshRepo.delete({ token }); // token rotation

    const user = await authRepo.userRepo.findOne({
      where: { id: record.user.id },
    });
    if (!user) throw new UnauthorizedError();

    const accessToken = signAccess(user.id, user.role);
    const refreshToken = jwt.sign({ sub: user.id }, jwtSecret, refreshOptions);
    await authRepo.refreshRepo.save({ token: refreshToken, user });
    return { accessToken, refreshToken };
  },

  logout: async (token: string) => {
    await authRepo.refreshRepo.delete({ token });
  },
};
