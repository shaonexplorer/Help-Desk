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

/** The two roles a crew member can hold. Kept in sync with the Prisma Role enum. */
const ROLES = ['ADMIN', 'AGENT'] as const;
type Role = (typeof ROLES)[number];

/**
 * Validate the body of a create-user request. All three fields are required:
 * name (non-empty string), email (valid format), password (8–128 chars).
 */
export function validateCreateUserBody(body: unknown): ValidationResult<{
  name: string;
  email: string;
  password: string;
  role: Role;
}> {
  if (typeof body !== 'object' || body === null) {
    return fail(['Request body must be an object']);
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  // Name
  if (!isNonEmptyString(record.name)) {
    errors.push('"name" is required');
  }

  // Email — basic format check without pulling in a dependency.
  if (!isNonEmptyString(record.email)) {
    errors.push('"email" is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    errors.push('"email" must be a valid email address');
  }

  // Password
  if (typeof record.password !== 'string' || record.password.length === 0) {
    errors.push('"password" is required');
  } else if (record.password.length < 8) {
    errors.push('"password" must be at least 8 characters');
  } else if (record.password.length > 128) {
    errors.push('"password" must be at most 128 characters');
  }

  // Role — defaults to AGENT if omitted.
  const role = record.role === 'ADMIN' ? 'ADMIN' : 'AGENT';

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    name: record.name as string,
    email: record.email as string,
    password: record.password as string,
    role,
  });
}

/**
 * Validate the body of an update-user request. All fields are optional, but at
 * least one must be provided. When present, each field is validated the same
 * way as the create endpoint.
 */
export function validateUpdateUserBody(body: unknown): ValidationResult<{
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}> {
  if (typeof body !== 'object' || body === null) {
    return fail(['Request body must be an object']);
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];
  let hasField = false;

  // Name — optional
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      errors.push('"name" must be a non-empty string');
    } else {
      hasField = true;
    }
  }

  // Email — optional
  if (record.email !== undefined) {
    if (!isNonEmptyString(record.email)) {
      errors.push('"email" is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      errors.push('"email" must be a valid email address');
    } else {
      hasField = true;
    }
  }

  // Password — optional
  if (record.password !== undefined) {
    if (typeof record.password !== 'string' || record.password.length === 0) {
      // Empty string means "don't change password" — treat as omitted.
    } else if (record.password.length < 8) {
      errors.push('"password" must be at least 8 characters');
    } else if (record.password.length > 128) {
      errors.push('"password" must be at most 128 characters');
    } else {
      hasField = true;
    }
  }

  // Role — optional
  if (record.role !== undefined) {
    if (record.role !== 'ADMIN' && record.role !== 'AGENT') {
      errors.push('"role" must be "ADMIN" or "AGENT"');
    } else {
      hasField = true;
    }
  }

  if (!hasField) {
    errors.push('At least one of name, email, password, or role must be provided');
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    name: record.name as string | undefined,
    email: record.email as string | undefined,
    password: record.password as string | undefined,
    role: record.role as Role | undefined,
  });
}
