import type { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../core';
import { TicketModel } from './ticket.model';
import { UserModel } from '../users/user.model';
import { validateIdParam } from '../users/user.validation';
import { validateCreateTicketBody, validateTicketListQuery } from './ticket.validation';

/**
 * Ticket controller — owns the HTTP layer for ticket resources. It shapes the
 * request, calls the model, and shapes the response. No Prisma, no query
 * building, no business rules here — those live in the model. Failures are
 * thrown as HttpError; asyncHandler forwards them to the error handler.
 */
export const TicketController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = validateTicketListQuery(req.query as Record<string, unknown>);
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const { tickets, meta } = await TicketModel.paginatedList(result.value);
    res.json({ tickets, meta });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const result = validateIdParam({ id: req.params.id });
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const ticket = await TicketModel.findById(result.value);
    if (!ticket) throw new HttpError(404, 'Ticket not found');

    res.json({ ticket });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const result = validateCreateTicketBody(req.body);
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const { assignedToId, ...ticketData } = result.value;

    // Validate assignedToId if provided — must reference a live (non-deleted) user.
    if (assignedToId) {
      const assignee = await UserModel.findById(assignedToId);
      if (!assignee) {
        throw new HttpError(400, '"assignedToId" does not reference a valid user');
      }
      if (assignee.deletedAt) {
        throw new HttpError(400, 'Assigned-to user is deactivated');
      }
    }

    const ticket = await TicketModel.createTicket(
      { ...ticketData, assignedToId: assignedToId ?? null },
      (req as any).user.id,
    );

    res.status(201).json({ ticket });
  }),
};
