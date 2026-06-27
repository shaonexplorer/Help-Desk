import { Router } from 'express';
import type { Mountable } from '../../core/router';
import { mountHealth } from './health.route';

export const healthModule: Mountable = {
  mount(router: Router): void {
    mountHealth(router);
  },
};
