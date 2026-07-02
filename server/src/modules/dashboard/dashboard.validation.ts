import { ok, fail } from '../../core/validate';
import type { ValidationResult } from '../../core/validate';

export const VALID_RANGES = ['7d', '30d', '90d'] as const;
export type DashboardRange = (typeof VALID_RANGES)[number];

export type DashboardQuery = {
  range: DashboardRange;
};

/**
 * Convert a range string to a Date representing the start of the range.
 */
export function rangeToStartDate(range?: DashboardRange): Date {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function validateDashboardQuery(
  query: Record<string, unknown>,
): ValidationResult<DashboardQuery> {
  const errors: string[] = [];

  let range: DashboardRange = '30d';
  if (query.range !== undefined) {
    if (typeof query.range !== 'string' || !VALID_RANGES.includes(query.range as DashboardRange)) {
      errors.push(`"range" must be one of ${VALID_RANGES.join(', ')}`);
    } else {
      range = query.range as DashboardRange;
    }
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({ range });
}