import type { Role } from '../../../shared/constants/roles.js';

/** Public representation of a user — excludes the password hash. */
export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  role?: Role;
  password?: string;
}
