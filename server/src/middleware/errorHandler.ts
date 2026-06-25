import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error‑handling middleware for Express.
 * It catches errors passed via `next(err)` and formats a JSON response.
 * If the error has a `status` property (e.g., created by our own helpers),
 * that status code is used; otherwise we default to 500.
 */
export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  // eslint‑disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';
  // In production we avoid leaking stack traces; in development we can include them.
  const response: Record<string, unknown> = { error: message };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }
  res.status(status).json(response);
}
