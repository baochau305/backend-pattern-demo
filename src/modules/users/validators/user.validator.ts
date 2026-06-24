import { z } from 'zod';
import { ROLES } from '../../../shared/constants/roles.js';

const roleSchema = z.enum(ROLES as [string, ...string[]]);

export const createUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72),
    name: z.string().trim().min(1).max(255).optional(),
    role: roleSchema.optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    password: z.string().min(8).max(72).optional(),
    role: roleSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
