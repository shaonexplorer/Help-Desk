import { Router } from 'express';
import type { Mountable } from '../../core/router';
import { mountUsers } from './user.route';

export const usersModule: Mountable = {
  mount(router: Router): void {
    mountUsers(router);
  },
};
