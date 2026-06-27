import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wrap an async controller so a rejected promise forwards to `next` instead of
 * crashing the process. This removes the repetitive try/catch from every
 * controller — a controller either responds or throws, and the error handler
 * deals with the rest.
 */
export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
