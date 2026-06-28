import { Router } from 'express';
import type { Mountable } from '../../core/router';
import { mountTickets } from './ticket.route';

export const ticketsModule: Mountable = {
  mount(router: Router): void {
    mountTickets(router);
  },
};
