import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import errorHandler from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import { auth } from './auth';
import { compose } from './core/router';
import { healthModule } from './modules/health';
import { usersModule } from './modules/users';
import { ticketsModule } from './modules/tickets';
import { webhooksModule } from './modules/webhooks';
import { dashboardModule } from './modules/dashboard';

import path from 'path';
import { toNodeHandler } from 'better-auth/node';
import { seedAdmin } from './scripts/seed-admin';
const app = express();
const PORT = process.env.PORT ?? 5000;

// CORS — allow the Vite dev server to call the API during development.
// Better Auth uses cookies, so we must reflect the request origin (not "*")
// and enable credentials.
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
app.use(
  cors({
    origin(origin: string | undefined, callback: (err: Error | null, allowed: boolean) => void) {
      // Allow same-origin requests (no Origin header) and configured origins.
      if (!origin) return callback(null, true);
      const allowed = process.env.CORS_ORIGIN?.split(',') ?? DEV_ORIGINS;
      callback(null, allowed.includes(origin));
    },
    credentials: true,
  }),
);

// Parse JSON bodies
app.use(express.json());

app.all('/api/auth/*', toNodeHandler(auth));

// Serve static files from the built React app (when built)
// In monorepo with npm workspaces, client dist is at ./client/dist from project root
const clientDistPath = path.join(process.cwd(), '..', 'client', 'dist');

app.use(express.static(clientDistPath));

// API routes — every feature module composes here, then the whole tree is gated
// behind Better Auth. /api/auth/* above stays public so sign-in/sign-up/sign-out
// work. Adding a future module (tickets, ...) is one import + one line here.
// Webhooks are public but verified by Resend signature, not auth.
app.use('/api', compose([healthModule, webhooksModule]));

app.use('/api', requireAuth, compose([usersModule, ticketsModule, dashboardModule]));

app.use(errorHandler);

// Fallback for client‑side routing (serve index.html)
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Socket.io setup for real-time ticket updates
import { Server } from 'socket.io';

// Export io instance for use in other modules (controllers, etc.)
export let io: Server;

const httpServer = http.createServer(app);
io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests from Vite dev server and production origins
      if (!origin) return callback(null, true);
      const allowed = process.env.CORS_ORIGIN?.split(',') ?? DEV_ORIGINS;
      if (allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

// Connection handling
io.on('connection', (socket: import('socket.io').Socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join:dashboard', () => {
    socket.join('dashboard');
    console.log(`Socket ${socket.id} joined dashboard room`);
  });

  socket.on('subscribe:tickets', () => {
    socket.join('tickets');
    console.log(`Socket ${socket.id} subscribed to tickets stream`);
  });

  socket.on('leave:dashboard', () => {
    socket.leave('dashboard');
  });

  socket.on('unsubscribe:tickets', () => {
    socket.leave('tickets');
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', socket.id, 'reason:', reason);
  });
});

seedAdmin().finally(() => {
  httpServer.listen(PORT, () => console.log(`🚀 Server listening at http://localhost:${PORT}`));
});
