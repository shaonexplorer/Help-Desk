import { Router, Request, Response } from 'express';

const router = Router();

// Example GET endpoint
router.get('/hello', (_req: Request, res: Response) => {
  res.json({ message: '👋 from Express + TypeScript!' });
});

// NOTE: future routes must validate input (zod / typed schema) and never
// reflect req.body verbatim — see middleware/auth.ts for the authorization
// guard and the security review notes in CLAUDE.md.

export default router;
