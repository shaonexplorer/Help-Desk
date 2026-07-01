import type { Request, Response } from 'express';
import { Resend } from 'resend';

/**
 * Health controller — the `/hello` probe. Synchronous and trivial, so it needs
 * no `asyncHandler` wrapper. It exists as a proper module to model the pattern
 * for future feature modules (tickets, ...).
 */
export const HealthController = {
  hello(_req: Request, res: Response): void {
    res.json({ message: '👋 from Express + TypeScript!' });
  },

  async resend(_req: Request, res: Response): Promise<void> {
    const email_id = _req.body.data.email_id;

    const resend = new Resend('re_4inQt3k1_PtJNUwEqaHEdMk6B6LnncgvM');

    const { data } = await resend.emails.receiving.get(email_id);

    if (data) {
      const { from, subject, text } = data;
      console.log(from, subject, text);
    }
    res.json({ message: '👋 from Express + TypeScript!' });
  },
};
