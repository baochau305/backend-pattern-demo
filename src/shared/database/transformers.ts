import type { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL returns `numeric`/`decimal` columns as *strings* (to preserve
 * arbitrary precision). This transformer converts them to JS numbers on read so
 * the rest of the app works with `number`, while writes pass through unchanged.
 * Money is stored as `numeric` (never float) to avoid binary rounding errors.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
