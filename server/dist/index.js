import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import errorHandler from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import { auth } from './auth';
import { compose } from './core/router';
import { healthModule } from './modules/health';
import { usersModule } from './modules/users';
import { ticketsModule } from './modules/tickets';
import { webhooksModule } from './modules/webhooks';
import path from 'path';
import { toNodeHandler } from 'better-auth/node';
import { seedAdmin } from './scripts/seed-admin';
const app = express();
const PORT = process.env.PORT ?? 5000;
// CORS — allow the Vite dev server to call the API during development.
// Better Auth uses cookies, so we must reflect the request origin (not "*")
// and enable credentials.
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
    origin(origin, callback) {
        // Allow same-origin requests (no Origin header) and configured origins.
        if (!origin)
            return callback(null, true);
        const allowed = process.env.CORS_ORIGIN?.split(',') ?? DEV_ORIGINS;
        callback(null, allowed.includes(origin));
    },
    credentials: true,
}));
// Parse JSON bodies
app.use(express.json());
app.all('/api/auth/*', toNodeHandler(auth));
// Serve static files from the built React app (when built)
app.use(express.static(path.join(process.cwd(), '..', '..', 'client', 'dist')));
// API routes — every feature module composes here, then the whole tree is gated
// behind Better Auth. /api/auth/* above stays public so sign-in/sign-up/sign-out
// work. Adding a future module (tickets, ...) is one import + one line here.
// Webhooks are public but verified by Resend signature, not auth.
app.use('/api', compose([healthModule, webhooksModule]));
app.use('/api', requireAuth, compose([usersModule, ticketsModule]));
app.use(errorHandler);
// Fallback for client‑side routing (serve index.html)
app.get('*', (_req, res) => {
    res.sendFile(path.join(process.cwd(), '..', '..', 'client', 'dist', 'index.html'));
});
seedAdmin().finally(() => {
    app.listen(PORT, () => console.log(`🚀 Server listening at http://localhost:${PORT}`));
});
