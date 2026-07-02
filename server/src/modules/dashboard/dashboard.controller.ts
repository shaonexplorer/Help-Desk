import type { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../core';
import { DashboardModel } from './dashboard.model';
import { validateDashboardQuery } from './dashboard.validation';

export const DashboardController = {
  /**
   * GET /api/dashboard/stats
   * Returns key dashboard statistics (KPIs).
   */
  getStats: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const stats = await DashboardModel.getStats(validation.value.range);
    res.json({ stats });
  }),

  /**
   * GET /api/dashboard/tickets-by-status
   * Returns ticket counts grouped by status.
   */
  getTicketsByStatus: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const data = await DashboardModel.getTicketsByStatus(validation.value.range);
    res.json({ data });
  }),

  /**
   * GET /api/dashboard/tickets-by-priority
   * Returns ticket counts grouped by priority.
   */
  getTicketsByPriority: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const data = await DashboardModel.getTicketsByPriority(validation.value.range);
    res.json({ data });
  }),

  /**
   * GET /api/dashboard/tickets-by-category
   * Returns ticket counts grouped by category.
   */
  getTicketsByCategory: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const data = await DashboardModel.getTicketsByCategory(validation.value.range);
    res.json({ data });
  }),

  /**
   * GET /api/dashboard/tickets-by-assignee
   * Returns ticket counts grouped by assignee (top 10).
   */
  getTicketsByAssignee: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const data = await DashboardModel.getTicketsByAssignee(validation.value.range);
    res.json({ data });
  }),

  /**
   * GET /api/dashboard/tickets-over-time
   * Returns ticket trend over time (daily counts by status).
   */
  getTicketsOverTime: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const data = await DashboardModel.getTicketsOverTime(validation.value.range);
    res.json({ data });
  }),

  /**
   * GET /api/dashboard/resolution-time-trend
   * Returns average resolution time trend over time.
   */
  getResolutionTimeTrend: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = validateDashboardQuery(req.query);
    if (!validation.ok) {
      throw new HttpError(400, validation.errors.join(', '));
    }

    const data = await DashboardModel.getResolutionTimeTrend(validation.value.range);
    res.json({ data });
  }),
};