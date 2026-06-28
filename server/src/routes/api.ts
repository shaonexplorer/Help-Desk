import { Router } from 'express';
import { compose } from '../core/router';
import { healthModule } from '../modules/health';
import { usersModule } from '../modules/users';
import { ticketsModule } from '../modules/tickets';

/**
 * Build the composed API router. The actual mount point lives in index.ts, which
 * gates this behind requireAuth; this factory exists so the router can be
 * imported elsewhere (tests, a future serverless handler) without re-describing
 * the module list. Adding a future module (tickets, ...) is one line here and
 * one line in index.ts.
 */
export function buildApiRouter(): Router {
  return compose([healthModule, usersModule, ticketsModule]);
}
