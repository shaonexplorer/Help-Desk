/**
 * Zod-free validation. A validator returns this result type; controllers check
 * "ok" and branch. The shape is close enough to zod's that swapping later is a
 * find/replace inside each modules validation file only.
 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function fail<T>(errors: string[]): ValidationResult<T> {
  return { ok: false, errors };
}

/** Hand-written guard — the only validator primitive in the kernel. */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}
