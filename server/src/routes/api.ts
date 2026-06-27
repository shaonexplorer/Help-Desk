import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

// Example GET endpoint
router.get('/hello', (_req: Request, res: Response) => {
  res.json({ message: '👋 from Express + TypeScript!' });
});

// Crew roster — the people behind the desk. Already guarded by requireAuth
// mounted in index.ts, so only a valid session reaches here. We expose the
// minimum fields a roster needs; never leak the full User row.
router.get('/users', async (_req: Request, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// NOTE: future routes must validate input (zod / typed schema) and never
// reflect req.body verbatim — see middleware/auth.ts for the authorization
// guard and the security review notes in CLAUDE.md.

export default router;
