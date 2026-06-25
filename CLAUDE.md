# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Help-Desk is a full-stack ticketing app in **early scaffold stage**. The monorepo is set up and runs, but the core ticket domain does not exist yet. Currently the app only has demo "Hello" routes, a single `Button` component, and a placeholder UI. Better Auth is wired on the server but there is no auth UI or protected-route middleware on the client.

## Common Development Commands

| Task | Command |
|------|---------|
| Install all dependencies (root + workspaces) | `npm install` |
| Start **both** server and client (watch mode) | `npm run dev` |
| Start **only** the Express backend | `npm run dev --workspace=server` |
| Start **only** the Vite React frontend | `npm run dev --workspace=client` |
| Build the production client bundle | `npm run build --workspace=client` |
| Build the server TypeScript output | `npm run build --workspace=server` |
| Run the compiled server (serves static files from `client/dist`) | `node server/dist/index.js` |

> **Note:** The project uses **npm workspaces**. All workspace-level scripts can be invoked with the `--workspace=<name>` flag as shown above.

## High-Level Architecture

```
Help-Desk (root)
│
├─ package.json            ← workspace definitions, root scripts
├─ tsconfig.base.json      ← shared TypeScript compiler options
├─ prisma/
│   └─ schema.prisma       ← DB schema (User, Session, Account, Verification)
│
├─ client/                 ← React UI (Vite + TypeScript)
│   ├─ src/
│   │   ├─ main.ts         ← React entry point (createRoot + StrictMode)
│   │   ├─ App.tsx         ← Root component
│   │   ├─ api.ts          ← API client utilities (fetchHello)
│   │   ├─ style.css       ← Tailwind v4 import + @theme tokens + base layer
│   │   ├─ lib/utils.ts    ← cn() helper (clsx + tailwind-merge)
│   │   └─ components/ui/  ← shadcn-style components (only Button so far)
│   ├─ index.html          ← Vite entry, mounts #app
│   ├─ vite.config.ts      ← React plugin, Tailwind, @ alias, /api proxy
│   ├─ tsconfig.json       ← extends base, bundler moduleResolution, path alias
│   └─ package.json        ← React 19, Vite 8, Tailwind v4, shadcn, @base-ui
│
└─ server/                 ← Express API (TypeScript)
    ├─ src/
    │   ├─ index.ts        ← Express entry: JSON parsing, /api/auth, static files, /api router, errorHandler
    │   ├─ auth.ts         ← Better Auth instance (Prisma adapter, email+password, DB sessions)
    │   ├─ prisma.ts       ← PrismaClient singleton
    │   ├─ routes/api.ts   ← Demo routes: GET /hello, POST /echo
    │   └─ middleware/
    │       └─ errorHandler.ts ← Centralized JSON error handler
    ├─ .env                ← DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
    ├─ tsconfig.json       ← extends base, targets CommonJS, ESNext modules
    └─ package.json        ← Express 4, Prisma 6, tsx, @types/express 4
```

### Environment Variables

The server reads from `server/.env` (loaded via `dotenv/config` in `server/src/index.ts`). Required vars:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler). **Must be named `DATABASE_URL`** — a typo here silently breaks every auth request. |
| `BETTER_AUTH_SECRET` | 32+ char random secret used to sign session tokens. |
| `BETTER_AUTH_URL` | Public base URL of the server (default `http://localhost:5000`). Used for CSRF origin checks. |

> **Note:** The root `.env` contains placeholder values. The real credentials live in `server/.env`. Prisma CLI commands need the server env inline: `DATABASE_URL=... npx prisma ...` (no `--env-file` flag in Prisma 6.16).

### Interaction Flow

1. **Development** – `npm run dev` launches both:
   * **Vite** serves the React app on port `3000` and proxies any `/api/*` requests to the Express server.
   * **tsx watch** runs the Express server on port `5000`, recompiling on TypeScript changes.

2. **Production Build** – `npm run build --workspace=client` creates a static bundle under `client/dist`. The Express server is then built (`npm run build --workspace=server`) and serves those static assets, enabling a single-process deployment.

3. **Shared TypeScript Settings** – `tsconfig.base.json` defines strict mode, module resolution, and JSON module support for both workspaces, keeping type-checking consistent across front- and back-end.

### Database & Auth Setup

The Prisma schema lives at the **root** `prisma/schema.prisma`. It defines the full Better Auth model set: `User` (String `id` via `cuid`), `Session`, `Account`, `Verification`.

Initial setup:
```bash
npx prisma generate --schema=prisma/schema.prisma
DATABASE_URL="..." npx prisma db push --schema=prisma/schema.prisma --accept-data-loss
npx @better-auth/cli@latest generate --config server/src/auth.ts   # merges BA models into schema
```

> **Windows note:** Prisma's `query_engine-windows.dll.node` is sometimes locked by a stale `node` process. If `prisma generate` fails with `EPERM ... rename ... .tmp*`, kill the offending `node` process and copy `node_modules/@prisma/engines/query_engine-windows.dll.node` into `node_modules/.prisma/client/` manually.

### Better Auth Endpoints

Better Auth mounts at `/api/auth/*` (handled by `toNodeHandler(auth)` in `index.ts`). Key routes:

| Route | Method | Notes |
|-------|--------|-------|
| `/api/auth/sign-up/email` | POST | Body: `name`, `email`, `password` (optional `image`, `callbackURL`, `rememberMe`). Returns `{ token, user }`. |
| `/api/auth/sign-in/email` | POST | Body: `email`, `password`. Returns `{ token, user }`. Sets session cookie. |
| `/api/auth/sign-out` | POST | **Requires `Origin` header matching `BETTER_AUTH_URL`** (CSRF). Returns `{ success: true }`. |
| `/api/auth/get-session` | GET | Read via session cookie. Returns `{ session, user }` or `null`. |

Sessions are stored in the DB (`storeSessionInDatabase: true`, 7-day expiry). `User.id` is a `cuid` string, not an autoincrement int.

### Protected Routes

Better Auth v1.6 ships no drop-in Express session middleware. To protect a route, add a `requireAuth` middleware in `server/src/middleware/auth.ts` that builds a Web `Request` from the Express `req` and calls `auth.handler` against `/api/auth/get-session`:

```ts
import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const request = new Request(new URL('/api/auth/get-session', 'http://localhost'), {
      headers: fromNodeHeaders(req.headers as any),
    });
    const body = (await (await auth.handler(request)).json()) as { session?: any; user?: any } | null;
    if (!body?.session) {
      const err = new Error('Unauthorized') as Error & { status?: number };
      err.status = 401;
      throw err;
    }
    (req as any).user = body.user;
    (req as any).session = body.session;
    next();
  } catch (err) {
    next(err);
  }
}
```

Then mount with `router.get('/profile', requireAuth, handler)`. The existing `errorHandler` will translate the thrown `401` into `{ "error": "Unauthorized" }`.

## Frontend Notes

- **React 19** with `createRoot` in StrictMode, mounted on `#app`
- **Tailwind v4** using `@theme inline` design tokens in `style.css` (new v4 style, no `tailwind.config.js`)
- **shadcn v4** components go in `client/src/components/ui/` — add with `npx shadcn@latest add <component>`
- **Path alias**: `@/` maps to `client/src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- **API client**: `client/src/api.ts` has typed fetch helpers; only `fetchHello` exists so far
- **Only one UI component**: `Button` (wraps `@base-ui/react/button` with CVA variants)

## Known Gaps / TODOs

- **No ticket domain** — no Ticket model, routes, or UI; the app does not yet do anything "help desk"-like
- **No auth UI** — no sign-in/sign-up pages or auth state management on the client
- **No `requireAuth` middleware** — only documented as a pattern above; `server/src/middleware/auth.ts` does not exist
- **No tests** — no test framework installed
- **No git repo** — no `.git`, no commits, no `.gitignore`
- **No README** — only this CLAUDE.md documents the project
- **Demo routes only** — `/api/hello` and `/api/echo` are throwaway examples, not real features
- **Express 4 vs @types/express 5** — server uses `express@^4.21.2` but `@types/express@^5.0.6` is installed in client; minor type mismatch risk if shared types are added

## Documentation Guidance

When a user asks for library-specific information (e.g., Express API usage, React hooks, Vite configuration, or TypeScript language features), **always fetch the latest official docs via Context7** before answering:

1. Resolve the library ID:
   ```bash
   npx ctx7@latest library <library-name> "<user question>"
   ```
2. Query the docs with the returned ID:
   ```bash
   npx ctx7@latest docs <libraryId> "<user question>"
   ```
3. Answer using the fetched documentation.

If a quota error occurs, inform the user and suggest `npx ctx7@latest login` or setting the `CONTEXT7_API_KEY` environment variable.

**Better Auth Specific Guidance:**

When working with Better Auth configurations like the one in `server/src/auth.ts`, consider these patterns:

- Always check if `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set in environment
- Use `npx @better-auth/cli@latest generate --config server/src/auth.ts` to merge Better Auth models into the Prisma schema (the `migrate` command only works with the built-in Kysely adapter, not Prisma). Then apply with `npx prisma db push`.
- The `auth.ts` file should be exported as a function/config object for easy testing
- Session configuration should match your app's security needs
- Remember to import plugins from their dedicated paths (e.g., `from "better-auth/plugins/two-factor"`) for proper tree-shaking
- `BETTER_AUTH_SECRET` should be at least 32 characters; generate with `openssl rand -base64 32`
- Sign-out and other state-changing endpoints require the `Origin` header to match `BETTER_AUTH_URL` (CSRF protection)

---

*(End of CLAUDE.md)*
