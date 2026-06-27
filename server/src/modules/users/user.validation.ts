import { ok, fail, isNonEmptyString } from '../../core/validate';
import type { ValidationResult } from '../../core/validate';

/**
 * Request validation for user endpoints. Hand-rolled (no zod) — see
 * core/validate.ts for the rationale. Each function returns a
 * ValidationResult so the controller can branch on `ok`.
 */
export function validateIdParam(params: { id?: unknown }): ValidationResult<string> {
  return isNonEmptyString(params.id) ? ok(params.id) : fail(['"id" must be a non-empty string']);
}
