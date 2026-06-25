import express, { Request, Response } from 'express';
import 'dotenv/config';
import errorHandler from './middleware/errorHandler';
import { auth } from './auth';
import apiRouter from './routes/api';

import path from 'path';
import { toNodeHandler } from 'better-auth/node';

const app = express();
const PORT = process.env.PORT ?? 5000;

// Parse JSON bodies
app.use(express.json());

app.all('/api/auth/*', toNodeHandler(auth));

// Serve static files from the built React app (when built)
app.use(express.static(path.join(process.cwd(), '..', '..', 'client', 'dist')));

// API routes

app.use('/api', apiRouter);

app.use(errorHandler);

// Fallback for client‑side routing (serve index.html)
app.get('*', (_req, res) => {
  res.sendFile(path.join(process.cwd(), '..', '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server listening at http://localhost:${PORT}`));
