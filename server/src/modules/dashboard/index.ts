import { Mountable } from '../../core/router';
import { mountDashboard } from './dashboard.route';

/**
 * Dashboard module — composes the dashboard routes.
 * This is the single export consumed by the composition root in index.ts.
 */
export const dashboardModule: Mountable = {
  mount(router) {
    mountDashboard(router);
  },
};