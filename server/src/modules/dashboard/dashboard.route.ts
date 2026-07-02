import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { requireAuth } from '../../middleware/auth';

/**
 * Mount dashboard routes on the provided router.
 * All routes are protected by requireAuth.
 */
export function mountDashboard(router: Router): void {
  router.get('/dashboard/stats', requireAuth, DashboardController.getStats);
  router.get('/dashboard/tickets-by-status', requireAuth, DashboardController.getTicketsByStatus);
  router.get('/dashboard/tickets-by-priority', requireAuth, DashboardController.getTicketsByPriority);
  router.get('/dashboard/tickets-by-category', requireAuth, DashboardController.getTicketsByCategory);
  router.get('/dashboard/tickets-by-assignee', requireAuth, DashboardController.getTicketsByAssignee);
  router.get('/dashboard/tickets-over-time', requireAuth, DashboardController.getTicketsOverTime);
  router.get('/dashboard/resolution-time-trend', requireAuth, DashboardController.getResolutionTimeTrend);
}