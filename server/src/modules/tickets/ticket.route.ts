import { Router } from 'express';
import { TicketController } from './ticket.controller';

/** Wire ticket endpoints onto the root router. Pure wiring — no logic. */
export function mountTickets(router: Router): void {
  router.get('/tickets', TicketController.list);
  router.get('/tickets/:id', TicketController.getById);
  router.post('/tickets', TicketController.create);
  router.patch('/tickets/:id', TicketController.update);
}
