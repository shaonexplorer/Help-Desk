import { Router } from 'express';
import { WebhookController } from './webhook.controller';

/** Wire the Resend webhook endpoint. Public but signature-verified. */
export function mountWebhooks(router: Router): void {
  router.post('/webhooks/resend', WebhookController.resend);
}
