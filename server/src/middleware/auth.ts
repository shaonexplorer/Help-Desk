import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth';
import { HttpError } from '../core/http-error';
import type { NextFunction, Request, Response } from 'express';

/**
 * Gate every route behind a valid Better Auth session. Mounted *before* the
 * api router in index.ts so /api/auth/* (public) is the only unprotected
 * surface. Future ticket/data routes are authenticated by default.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const base = process.env.BETTER_AUTH_URL ?? 'http://localhost';
    const url = new URL('/api/auth/get-session', base);
    const request = new Request(url, { headers: fromNodeHeaders(req.headers as any) });
    const resp = await auth.handler(request);
    const body = (await resp.json()) as { session?: unknown; user?: unknown } | null;

    if (!body?.session) {
      throw new HttpError(401, 'Unauthorized');
    }

    // Attach downstream handlers can read off.
    (req as any).user = body.user;
    (req as any).session = body.session;
    next();
  } catch (err) {
    next(err);
  }
}
