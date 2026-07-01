import { Router } from 'express';
import { HealthController } from './health.controller';

/** Wire the health probe onto the root router. */
export function mountHealth(router: Router): void {
  router.get('/hello', HealthController.hello);
  router.post('/hello', HealthController.resend);
}
