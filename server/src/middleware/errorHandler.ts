import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../core/http-error';

/**
 * Centralized error‑handling middleware for Express.
 * It catches errors passed via `next(err)` and formats a JSON response.
 * HttpError (thrown deliberately by controllers) carries its own status; anything
 * else falls back to a `err.status` (legacy) or 500.
 */
export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint‑disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err instanceof HttpError ? err.status : (err as { status?: number })?.status ?? 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  // In production we avoid leaking stack traces; in development we can include them.
  const response: Record<string, unknown> = { error: message };
  if (process.env.NODE_ENV !== 'production' && err instanceof Error && err.stack) {
    response.stack = err.stack;
  }
  res.status(status).json(response);
}
