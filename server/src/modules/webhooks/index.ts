import { Router } from 'express';
import type { Mountable } from '../../core/router';
import { mountWebhooks } from './webhook.route';

export const webhooksModule: Mountable = {
  mount(router: Router): void {
    mountWebhooks(router);
  },
};