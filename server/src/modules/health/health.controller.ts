import type { Request, Response } from 'express';

/**
 * Health controller — the `/hello` probe. Synchronous and trivial, so it needs
 * no `asyncHandler` wrapper. It exists as a proper module to model the pattern
 * for future feature modules (tickets, ...).
 */
export const HealthController = {
  hello(_req: Request, res: Response): void {
    res.json({ message: '👋 from Express + TypeScript!' });
  },
};
