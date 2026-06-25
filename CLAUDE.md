# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Help-Desk is a full-stack ticketing app in **early scaffold stage**. The monorepo is set up and runs. Auth is fully wired end-to-end (Better Auth server + client SDK, login page, route protection, reactive sessions). The core ticket domain does not exist yet — the dashboard is a placeholder.

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
│   │   ├─ App.tsx         ← Root: AuthProvider + BrowserRouter + Routes
│   │   ├─ api.ts          ← API client utilities (fetchHello)
│   │   ├─ style.css       ← Tailwind v4 import + @theme tokens + base layer
│   │   ├─ lib/
│   │   │   ├─ utils.ts    ← cn() helper (clsx + tailwind-merge)
│   │   │   ├─ auth.tsx        ← AuthProvider + useAuth() hook (wraps useSession)
│   │   │   ├─ auth-client.ts  ← Better Auth client singleton (createAuthClient)
│   │   │   └─ auth-errors.ts  ← Error code → user-facing message map
│   │   └─ components/
│   │       ├─ login-page.tsx   ← Split-panel login layout
│   │       ├─ login-form.tsx   ← Login form (react-hook-form + zod + authClient.signIn)
│   │       ├─ dashboard.tsx    ← Placeholder authenticated page
│   │       ├─ protected-route.tsx ← Redirects to /login if no session
│   │       ├─ public-route.tsx    ← Redirects to / if already logged in
│   │       └─ ui/               ← shadcn-style components (Button, Input, Label)
│   ├─ index.html          ← Vite entry, mounts #app
│   ├─ vite.config.ts      ← React plugin, Tailwind, @ alias, /api proxy
│   ├─ tsconfig.json       ← extends base, bundler moduleResolution, path alias
│   └─ package.json        ← React 19, Vite 8, Tailwind v4, shadcn, better-auth, react-router-dom
│
└─ server/                 ← Express API (TypeScript)
    ├─ src/
    │   ├─ index.ts        ← Express entry: CORS (reflects origin, reads CORS_ORIGIN), JSON parsing, /api/auth, static files (../../client/dist), SPA fallback, /api router, errorHandler
    │   ├─ auth.ts         ← Better Auth instance (Prisma adapter, email+password, DB sessions)
    │   ├─ prisma.ts       ← PrismaClient singleton
    │   ├─ routes/api.ts   ← Demo routes: GET /hello, POST /echo
    │   └─ middleware/
    │       └─ errorHandler.ts ← Centralized JSON error handler
    ├─ .env                ← DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, PORT, CORS_ORIGIN
    ├─ tsconfig.json       ← extends base, module/target ESNext + es2023
    └─ package.json        ← Express 4, Prisma 6, tsx, @prisma/client (note: cors + better-auth imported but not listed)
```

### Environment Variables

The server reads from `server/.env` (loaded via `dotenv/config` in `server/src/index.ts`). Required vars:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler). **Must be named `DATABASE_URL`** — a typo here silently breaks every auth request. |
| `BETTER_AUTH_SECRET` | 32+ char random secret used to sign session tokens. |
| `BETTER_AUTH_URL` | Public base URL of the server (default `http://localhost:5000`). Used for CSRF origin checks. |
| `PORT` | Server port. Defaults to `5000` (`process.env.PORT ?? 5000`); `server/.env` sets `5001`. |
| `CORS_ORIGIN` | Comma-separated allowedOrigins override. Falls back to `http://localhost:3000,http://localhost:3001`. |

> **Note:** The root `.env` contains placeholder values. The real credentials live in `server/.env`. Prisma CLI commands need the server env inline: `DATABASE_URL=... npx prisma ...` (no `--env-file` flag in Prisma 6.16).

### Interaction Flow

1. **Development** – `npm run dev` launches both:
   * **Vite** serves the React app on port `3000` and proxies any `/api/*` requests to the Express server.
   * **tsx watch** runs the Express server on port `5001` (as configured in `server/.env`), recompiling on TypeScript changes.

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

### Better Auth Server

Better Auth mounts at `/api/auth/*` (handled by `toNodeHandler(auth)` in `index.ts`). Key routes:

| Route | Method | Notes |
|-------|--------|-------|
| `/api/auth/sign-up/email` | POST | Body: `name`, `email`, `password` (optional `image`, `callbackURL`, `rememberMe`). Returns `{ token, user }`. |
| `/api/auth/sign-in/email` | POST | Body: `email`, `password`. Returns `{ token, user }`. Sets session cookie. |
| `/api/auth/sign-out` | POST | **Requires `Origin` header matching a trusted origin** (CSRF). Returns `{ success: true }`. |
| `/api/auth/get-session` | GET | Read via session cookie. Returns `{ session, user }` or `null`. |

Sessions are stored in the DB (`storeSessionInDatabase: true`, 7-day expiry). `User.id` is a `cuid` string, not an autoincrement int.

**Server config** (`server/src/auth.ts`):
- Email + password enabled
- DB-backed sessions (7 days)
- `trustedOrigins: ['http://localhost:3000', 'http://localhost:3002']`
- CORS in `index.ts` reflects the request origin (not `*`) with `credentials: true` — required for cross-origin cookie auth

### Better Auth Client

The client uses the official `better-auth/react` SDK (v1.6.20):

```ts
// client/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL,  // "" in dev (uses Vite proxy)
  fetchOptions: { credentials: "include" },
});
```

**Key client methods:**
- `authClient.signIn.email({ email, password }, { onSuccess, onError })` — the `onError` callback receives `{ error: { code, message } }`. Error codes are in `authClient.$ERROR_CODES`.
- `authClient.signOut()` — clears the session cookie
- `authClient.useSession()` — reactive hook returning `{ data, isPending, isRefetching, error, refetch }`. Re-fetches automatically after sign-in/sign-out.
- `authClient.getSession()` — imperative fetch (for route guards / loaders)

**Error handling** (`client/src/lib/auth-errors.ts`): Maps Better Auth error codes to user-facing strings. Import `messageFor(code)` and use it in `onError` callbacks.

### Client Auth Flow

1. `AuthProvider` (`client/src/lib/auth.tsx`) wraps the app and exposes `{ user, loading, refresh }` via `useAuth()`.
2. `ProtectedRoute` (`client/src/components/protected-route.tsx`) redirects unauthenticated users to `/login` with `state={{ from: location }}`.
3. `PublicRoute` (`client/src/components/public-route.tsx`) redirects authenticated users away from `/login` to `/`.
4. After successful sign-in, `LoginForm` calls `authClient.signIn.email()` → `onSuccess` navigates to `from` (or `/`). `useSession()` re-fetches automatically — no manual `refresh()` needed.
5. After sign-out, `Dashboard` calls `authClient.signOut()` → navigates to `/login`. `useSession()` clears automatically.

### Protected Server Routes

Better Auth v1.6 ships no drop-in Express session middleware. To protect a server route, add a `requireAuth` middleware in `server/src/middleware/auth.ts` that builds a Web `Request` from the Express `req` and calls `auth.handler` against `/api/auth/get-session`:

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
- **React Router DOM v7** for client-side routing (`BrowserRouter` in `App.tsx`)
- **Tailwind v4** using `@theme inline` design tokens in `style.css` (new v4 style, no `tailwind.config.js`)
- **shadcn v4** components go in `client/src/components/ui/` — add with `npx shadcn@latest add <component>`
- **Path alias**: `@/` maps to `client/src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- **API client**: `client/src/api.ts` has typed fetch helpers; only `fetchHello` exists so far
- **UI components**: `Button`, `Input`, `Label` (all shadcn-style, wrapping `@base-ui/react/*` primitives)
- **Form patterns**: Login uses `react-hook-form` + `zod` for client-side validation before calling the Better Auth client

## Known Gaps / TODOs

- **No ticket domain** — no Ticket model, routes, or UI; the app does not yet do anything "help desk"-like
- **No `requireAuth` middleware on server** — only documented as a pattern above; `server/src/middleware/auth.ts` does not exist. All `/api` routes except `/api/auth/*` are unprotected.
- **No tests** — no test framework installed
- **No git repo** — no `.git`, no commits, no `.gitignore`
- **No README** — only this CLAUDE.md documents the project
- **Demo routes only** — `/api/hello` and `/api/echo` are throwaway examples, not real features
- **Missing server deps** — `server/src/index.ts` imports `cors` and `better-auth`, but neither is listed in `server/package.json` (only `@types/cors` is). Installs may currently resolve via hoisting from the root/client; fragile — add `cors` and `better-auth` explicitly.
- **No sign-up page** — sign-in works, but there's no UI for creating new accounts yet

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
- Sign-out and other state-changing endpoints require the `Origin` header to match a trusted origin (CSRF protection)
- The client SDK (`better-auth/react`) handles CSRF tokens automatically — no manual `getCsrfToken()` needed
- `useSession()` is reactive and re-fetches on sign-in/sign-out. Use `getSession()` only for imperative checks outside React render.
- Error codes from the client are typed as `string` (not a literal union) — cast via `error.code as keyof typeof authClient.$ERROR_CODES` when needed, or use the `messageFor()` helper in `client/src/lib/auth-errors.ts`

---

*(End of CLAUDE.md)*
