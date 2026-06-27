import { Router } from 'express';
import { UserController } from './user.controller';

/** Wire user endpoints onto the root router. Pure wiring — no logic. */
export function mountUsers(router: Router): void {
  router.get('/users', UserController.list);
  router.get('/users/:id', UserController.getById);
  router.post('/users', UserController.create);
  router.put('/users/:id', UserController.update);
  router.delete('/users/:id', UserController.delete);
}
