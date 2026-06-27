import type { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../core';
import { UserModel } from './user.model';
import { validateIdParam } from './user.validation';

/**
 * User controller — owns the HTTP layer for user resources. It shapes the
 * request, calls the model, and shapes the response. No Prisma, no query
 * building, no business rules here — those live in the model. Failures are
 * thrown as HttpError; asyncHandler forwards them to the error handler, so
 * there's no try/catch in sight.
 */
export const UserController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const users = await UserModel.findRoster();
    res.json({ users });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const result = validateIdParam({ id: req.params.id });
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    const user = await UserModel.findById(result.value);
    if (!user) throw new HttpError(404, 'User not found');

    res.json({ user });
  }),
};
