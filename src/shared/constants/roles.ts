/**
 * Application roles used by the RBAC layer. Kept as a const object (instead of a
 * TS `enum`) so the literal string values survive `erasableSyntaxOnly`/`isolatedModules`
 * transpilation and remain easy to persist in the database.
 */
export const Role = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES: Role[] = Object.values(Role);
