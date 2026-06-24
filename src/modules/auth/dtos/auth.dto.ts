import type { Role } from '../../../shared/constants/roles.js';

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

/** Public-safe representation of a user (never includes the password hash). */
export interface AuthUserDto {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResultDto extends TokenPairDto {
  user: AuthUserDto;
}
