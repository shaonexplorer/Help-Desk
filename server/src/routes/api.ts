import { Router, Request, Response } from 'express';

const router = Router();

// Example GET endpoint
router.get('/hello', (_req: Request, res: Response) => {
  res.json({ message: '👋 from Express + TypeScript!' });
});

// Example POST endpoint with simple validation
router.post('/echo', (req: Request, res: Response) => {
  const { payload } = req.body;
  if (!payload) {
    res.status(400).json({ error: 'payload is required' });
    return;
  }
  res.json({ echoed: payload });
});

export default router;
