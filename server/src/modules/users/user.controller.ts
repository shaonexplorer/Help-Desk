import type { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../core';
import { UserModel } from './user.model';
import { validateIdParam, validateCreateUserBody } from './user.validation';

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

  create: asyncHandler(async (req: Request, res: Response) => {
    const result = validateCreateUserBody(req.body);
    if (!result.ok) throw new HttpError(400, result.errors.join(', '));

    try {
      const user = await UserModel.createUser(result.value);
      res.status(201).json({ user });
    } catch (err) {
      // Better Auth returns a structured error when the email is already taken.
      const message = err instanceof Error ? err.message : 'Failed to create user';
      if (message.includes('422') || message.includes('already')) {
        throw new HttpError(409, 'A user with this email already exists');
      }
      throw new HttpError(500, message);
    }
  }),
};
