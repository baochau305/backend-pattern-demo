import { z } from 'zod';

/**
 * Request schemas for the auth endpoints. The password policy lives here so it is
 * enforced consistently and documented in one place. `.strict()` rejects unknown
 * keys, preventing mass-assignment of unexpected fields.
 */
export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'), // bcrypt truncates beyond 72 bytes
    name: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, 'refreshToken is required'),
  })
  .strict();

export const logoutSchema = refreshSchema;
