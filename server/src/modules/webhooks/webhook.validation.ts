import { ok, fail, isNonEmptyString } from '../../core/validate';
import type { ValidationResult } from '../../core/validate';

/**
 * Expected Resend webhook payload structure for email.received events.
 * See: https://resend.com/docs/dashboard/receiving/introduction
 */
export type ResendWebhookPayload = {
  type: 'email.received';
  data: {
    email_id: string;
  };
};

/**
 * Validate the verified webhook payload.
 * Only accepts 'email.received' events with a valid email_id.
 */
export function validateWebhookPayload(
  payload: unknown,
): ValidationResult<ResendWebhookPayload> {
  if (typeof payload !== 'object' || payload === null) {
    return fail(['Payload must be an object']);
  }

  const record = payload as Record<string, unknown>;
  const errors: string[] = [];

  // Type must be 'email.received'
  if (record.type !== 'email.received') {
    errors.push(`Unsupported event type: ${record.type}. Expected 'email.received'`);
  }

  // Data must be an object with email_id
  if (typeof record.data !== 'object' || record.data === null) {
    errors.push('Missing or invalid "data" object');
  } else {
    const data = record.data as Record<string, unknown>;
    if (!isNonEmptyString(data.email_id)) {
      errors.push('"data.email_id" is required and must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    type: 'email.received',
    data: {
      email_id: (record.data as { email_id: string }).email_id,
    },
  });
}