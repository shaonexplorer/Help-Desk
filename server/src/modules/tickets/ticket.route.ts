import { Router } from 'express';
import { TicketController } from './ticket.controller';

/** Wire ticket endpoints onto the root router. Pure wiring — no logic. */
export function mountTickets(router: Router): void {
  router.get('/tickets', TicketController.list);
  router.get('/tickets/:id', TicketController.getById);
  router.get('/tickets/:id/messages', TicketController.getMessages);
  router.post('/tickets', TicketController.create);
  router.patch('/tickets/:id', TicketController.update);
  router.post('/tickets/:id/reply', TicketController.reply);
  router.post('/tickets/:id/polish', TicketController.polish);
}
