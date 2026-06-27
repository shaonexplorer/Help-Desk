# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Help-Desk is a full-stack ticketing app in **early scaffold stage**. The monorepo is set up and runs. Auth is fully wired end-to-end (Better Auth server + client SDK, login page, route protection, reactive sessions). The server is organized as a **modular MVC** (a shared `core/` kernel plus self-contained feature `modules/` composed in `index.ts`). The crew users domain exists (list + detail, admin/agent roles); the core ticket domain does not yet.

## Common Development Commands

| Task | Command |
|------|---------|
| Install all dependencies (root + workspaces) | `npm install` |
| Start **both** server and client (watch mode) | `npm run dev` |
| Start **only** the Express backend | `npm run dev --workspace=server` |
| Seed the admin user (idempotent) | `npm run seed --workspace=server` |
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
│  └─ schema.prisma       ← DB schema (User + Role enum, Session, Account, Verification)
│
├─ client/                 ← React UI (Vite + TypeScript)
│  ├─ src/
│  │  ├─ main.ts            ← React entry: StrictMode + QueryProvider + App
│  │  ├─ App.tsx            ← Root: AuthProvider + BrowserRouter + Routes
│  │  ├─ api/               ← Per-domain API modules (mirrors server modules)
│  │  │  ├─ index.ts        ← Barrel re-export of all API functions/types
│  │  │  ├─ users.ts        ← fetchUsers, fetchUser, RosterUser, Role
│  │  │  └─ health.ts       ← fetchHello, HelloResponse
│  │  ├─ style.css          ← Tailwind v4 import + @theme tokens + base layer
│  │  ├─ lib/
│  │  │  ├─ utils.ts        ← cn() helper (clsx + tailwind-merge)
│  │  │  ├─ api-client.ts   ← Shared axios instance (withCredentials, relative baseURL)
│  │  │  ├─ query-client.tsx← QueryClient + QueryProvider (@tanstack/react-query)
│  │  │  ├─ auth.tsx        ← AuthProvider + useAuth() hook (wraps useSession)
│  │  │  ├─ auth-client.ts  ← Better Auth client singleton (createAuthClient)
│  │  │  └─ auth-errors.ts  ← Error code → user-facing message map
│  │  └─ components/
│  │       ├─ app-shell.tsx       ← Shared navbar (brand + Dashboard/Crew nav + sign out)
│  │       ├─ login-page.tsx      ← Split-panel login layout
│  │       ├─ login-form.tsx      ← Login form (react-hook-form + zod + authClient.signIn)
│  │       ├─ dashboard.tsx       ← Authenticated home (health probe via useQuery)
│  │       ├─ users-list-page.tsx ← Crew roster table (roles, presence, useQuery)
│  │       ├─ protected-route.tsx ← Redirects to /login if no session
│  │       ├─ public-route.tsx    ← Redirects to / if already logged in
│  │       └─ ui/                 ← shadcn-style components (Button, Input, Label, Table)
│  ├─ index.html             ← Vite entry, mounts #app
│  ├─ vite.config.ts         ← React plugin, Tailwind, @ alias, /api proxy
│  ├─ tsconfig.json          ← extends base, bundler moduleResolution, path alias
│  └─ package.json           ← React 19, Vite 8, Tailwind v4, shadcn, axios, @tanstack/react-query
│
└─ server/                  ← Express API (TypeScript) — modular MVC
   ├─ src/
   │  ├─ index.ts           ← Express entry: CORS, JSON, /api/auth, static files,
   │  │                        composes + mounts feature modules at /api behind
   │  │                        requireAuth, errorHandler, SPA fallback
   │  ├─ auth.ts            ← Better Auth instance (Prisma adapter, email+password, DB sessions)
   │  ├─ prisma.ts          ← PrismaClient singleton (shared by all models)
   │  ├─ core/              ← Shared kernel (cross-cutting infra)
   │  │  ├─ http-error.ts       ← HttpError(status, message) — controlled failures
   │  │  ├─ async-handler.ts    ← asyncHandler(fn) — forwards rejects to next()
   │  │  ├─ validate.ts         ← ValidationResult<T>, ok/fail/isNonEmptyString
   │  │  ├─ router.ts           ← Mountable interface + compose(modules)
   │  │  └─ index.ts            ← Barrel
   │  ├─ modules/           ← One self-contained folder per domain feature
   │  │  ├─ health/
   │  │  │  ├─ health.controller.ts  ← HealthController.hello
   │  │  │  ├─ health.route.ts       ← mountHealth(router)
   │  │  │  └─ index.ts              ← exports healthModule: Mountable
   │  │  └─ users/
   │  │     ├─ user.model.ts      ← Prisma access + ROSTER_SELECT allow-list
   │  │     ├─ user.validation.ts ← validateIdParam + ValidationResult
   │  │     ├─ user.controller.ts ← UserController.list / getById (asyncHandler + HttpError)
   │  │     ├─ user.route.ts      ← mountUsers(router)
   │  │     └─ index.ts           ← exports usersModule: Mountable
   │  ├─ routes/
   │  │  └─ api.ts           ← buildApiRouter() factory (composition root)
   │  └─ middleware/
   │      ├─ auth.ts          ← requireAuth — gates /api/* behind a Better Auth session
   │      └─ errorHandler.ts  ← Centralized JSON error handler (understands HttpError)
   ├─ .env                   ← DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, PORT, CORS_ORIGIN
   ├─ tsconfig.json          ← extends base, module/target ESNext + es2023
   └─ package.json           ← Express 4, Prisma 6, tsx, cors, better-auth
```

### Environment Variables

The server reads from `server/.env` (loaded via `dotenv/config` in `server/src/index.ts`). Required vars:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler). **Must be named `DATABASE_URL`** — a typo here silently breaks every auth request. |
| `BETTER_AUTH_SECRET` | 32+ char random secret used to sign session tokens. |
| `BETTER_AUTH_URL` | Public base URL of the server (default `http://localhost:5000`). Used for CSRF origin checks. |
| `PORT` | Server port. Defaults to `5000` (`process.env.PORT ?? 5000`); `server/.env` sets `5000`. |
| `CORS_ORIGIN` | Comma-separated allowedOrigins override. Falls back to `http://localhost:3000,http://localhost:3001`. |

> **Note:** The root `.env` contains placeholder values. The real credentials live in `server/.env`. Prisma CLI commands need the server env inline: `DATABASE_URL=... npx prisma ...` (no `--env-file` flag in Prisma 6.16).

### Interaction Flow

1. **Development** – `npm run dev` launches both:
   * **Vite** serves the React app on port `3000` and proxies any `/api/*` requests to the Express server.
   * **tsx watch** runs the Express server on port `5000` (as configured in `server/.env`), recompiling on TypeScript changes.

2. **Production Build** – `npm run build --workspace=client` creates a static bundle under `client/dist`. The Express server is then built (`npm run build --workspace=server`) and serves those static assets, enabling a single-process deployment.

3. **Shared TypeScript Settings** – `tsconfig.base.json` defines strict mode, module resolution, and JSON module support for both workspaces, keeping type-checking consistent across front- and back-end.

### Database & Auth Setup

The Prisma schema lives at the **root** `prisma/schema.prisma`. It defines the full Better Auth model set plus the app's `Role` enum: `User` (String `id` via `cuid`, `role Role @default(AGENT)`), `Session`, `Account`, `Verification`.

Initial setup:
```bash
npx prisma generate --schema=prisma/schema.prisma
DATABASE_URL="..." npx prisma db push --schema=prisma/schema.prisma --accept-data-loss
npx @better-auth/cli@latest generate --config server/src/auth.ts   # merges BA models into schema
```

> **Windows note:** Prisma's `query_engine-windows.dll.node` is sometimes locked by a stale `node` process. If `prisma generate` fails with `EPERM ... rename ... .tmp*`, the generated TypeScript types are still written correctly despite the engine-rename failure — the build will pass. If you need the engine binary itself, kill the offending `node` process and copy `node_modules/@prisma/engines/query_engine-windows.dll.node` into `node_modules/.prisma/client/` manually.

### Server Architecture — Modular MVC

The server separates a **shared kernel** (`core/`) from self-contained **feature modules** (`modules/`). `index.ts` is the single composition point: it composes the modules and mounts them at `/api` behind `requireAuth`.

**Shared kernel** (`server/src/core/`):
- `HttpError` — throw `new HttpError(status, message)` from a controller for any controlled non-500 failure (404, 400, 403 …). `errorHandler` translates it into `{ "error": message }`.
- `asyncHandler(fn)` — wraps an async controller so a rejected promise forwards to `next()` instead of crashing. This removes try/catch from every controller: a controller either responds or throws.
- `ValidationResult<T>` — a `{ ok: true; value } | { ok: false; errors }` union returned by validators, plus `ok`/`fail`/`isNonEmptyString` helpers. Zod-free by design; swapping to zod later is a find/replace inside `modules/**/*.validation.ts` only.
- `Mountable` + `compose(modules)` — each module exposes a `Mountable` (an object with a `mount(router)` method); `compose` builds one root router from many. Adding a feature module is one import + one entry in the `compose([...])` call in `index.ts`.

**Feature module layout** (each under `modules/<domain>/`):
- `*.model.ts` — the only file that talks to Prisma about this domain. Holds the query allow-list so future columns never leak through the API.
- `*.validation.ts` — request validation returning `ValidationResult`.
- `*.controller.ts` — the HTTP layer: shapes the request, calls the model, shapes the response. Uses `asyncHandler` + `HttpError`; no try/catch, no Prisma.
- `*.route.ts` — pure wiring (`mount<Domain>(router)`), no logic.
- `index.ts` — exports a `<domain>Module: Mountable`.

> **Note on "views":** this is a JSON API, so there are no HTML templates. The serialized JSON response the controller returns *is* the view.

**Adding a new feature module** (e.g. `tickets`): copy the `health/` folder as a scaffold, implement model/controller/route/validation, then register it in the `compose([...])` call in `index.ts`. No other file needs to change.

### Server Routes

All `/api/*` routes except `/api/auth/*` are gated behind `requireAuth` (mounted in `index.ts`). Better Auth stays public so sign-in/sign-up/sign-out work.

**Better Auth** (`/api/auth/*`, handled by `toNodeHandler(auth)`):

| Route | Method | Notes |
|-------|--------|-------|
| `/api/auth/sign-up/email` | POST | Body: `name`, `email`, `password`. Returns `{ token, user }`. |
| `/api/auth/sign-in/email` | POST | Body: `email`, `password`. Returns `{ token, user }`. Sets session cookie. |
| `/api/auth/sign-out` | POST | **Requires `Origin` header matching a trusted origin** (CSRF). Returns `{ success: true }`. |
| `/api/auth/get-session` | GET | Read via session cookie. Returns `{ session, user }` or `null`. |

**Feature modules** (composed in `index.ts`, all behind `requireAuth`):

| Route | Module | Notes |
|-------|--------|-------|
| `GET /api/hello` | health | Server greeting probe. Returns `{ message }`. |
| `GET /api/users` | users | Full crew roster, most-recent first. Returns `{ users: RosterUser[] }`. |
| `GET /api/users/:id` | users | Single crew member. Returns `{ user }`, or 404 `{ error }` if not found. |

Sessions are stored in the DB (`storeSessionInDatabase: true`, 7-day expiry). `User.id` is a `cuid` string, not an autoincrement int.

**Server config** (`server/src/auth.ts`):
- Email + password enabled
- DB-backed sessions (7 days)
- `trustedOrigins: ['http://localhost:3000', 'http://localhost:3002']`
- CORS in `index.ts` reflects the request origin (not `*`) with `credentials: true` — required for cross-origin cookie auth

### Protected Server Routes

`requireAuth` (`server/src/middleware/auth.ts`) is mounted on `/api` in `index.ts`, so every feature-module route is authenticated by default. It builds a Web `Request` from the Express `req` and calls `auth.handler` against `/api/auth/get-session`; a missing/invalid session throws `HttpError(401, 'Unauthorized')`, which `errorHandler` translates into `{ "error": "Unauthorized" }`. It also attaches `req.user` and `req.session` for downstream handlers.

To add per-route guards (e.g. admin-only), slot middleware between the path and the controller in the module's `*.route.ts`.

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
5. After sign-out, `AppShell` calls `authClient.signOut()` → navigates to `/login`. `useSession()` clears automatically.

### Client API Layer

Data fetching uses **axios** (`lib/api-client.ts`) plus **TanStack Query** (`lib/query-client.tsx`). The `api/` folder is split per domain to mirror the server's `modules/`:

- `api/users.ts` — `fetchUsers()`, `fetchUser(id)`, and the `RosterUser` / `Role` / response types.
- `api/health.ts` — `fetchHello()`.
- `api/index.ts` — barrel re-export, so components import from `@/api`.

The shared axios instance uses an empty `baseURL` (relative requests — Vite proxy in dev, same-origin in prod) and `withCredentials: true` to carry the session cookie. The `QueryClient` defaults to a 30s stale time, a single retry, and no refetch-on-window-focus.

Pages call the API through `useQuery` (e.g. `users-list-page.tsx` uses queryKey `["users"]`; `dashboard.tsx` uses `["health"]`). To invalidate after a mutation, call `queryClient.invalidateQueries({ queryKey: [...] })`.

## Frontend Notes

- **React 19** with `createRoot` in StrictMode, mounted on `#app`
- **React Router DOM v7** for client-side routing (`BrowserRouter` in `App.tsx`)
- **Tailwind v4** using `@theme inline` design tokens in `style.css` (new v4 style, no `tailwind.config.js`)
- **shadcn v4** components go in `client/src/components/ui/` — add with `npx shadcn@latest add <component>`
- **Path alias**: `@/` maps to `client/src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- **UI components**: `Button`, `Input`, `Label`, `Table` (all shadcn-style; `Table` wraps native table elements)
- **Form patterns**: Login uses `react-hook-form` + `zod` for client-side validation before calling the Better Auth client

## Admin Seed

`server/src/scripts/seed-admin.ts` seeds an admin user (`admin@gmail.com` / `password123`, role `ADMIN`) on server boot. It is invoked from `server/src/index.ts` before `app.listen`, so the admin is guaranteed to exist before the first request is served.

- Idempotent: re-running updates the existing user's role instead of duplicating.
- Uses Better Auth's own sign-up handler (synthetic `Request` via `auth.handler`) so the password hash and linked `Account` row are created exactly as the client sign-in flow expects — no manual hashing.
- The role is set via a direct Prisma update after sign-up, since the Better Auth sign-up endpoint doesn't accept custom fields.
- On failure, `process.exitCode = 1` is set but the server still starts listening — a transient DB hiccup during boot shouldn't leave the app dead.

To run manually: `npm run seed --workspace=server`.

## Known Gaps / TODOs

- **No ticket domain** — no Ticket model, routes, or UI; the app does not yet do anything "help desk"-like. (Scaffold a `tickets/` module using `modules/health/` as a template.)
- **No tests** — no test framework installed
- **No git repo** — no `.git`, no commits, no `.gitignore`
- **No README** — only this CLAUDE.md documents the project
- **No role management UI** — users have an admin/agent role (DB + API + table badge), but there's no interface to change a role yet
- **No sign-up page** — sign-in works, but there's no UI for creating new accounts yet

## Documentation Guidance

When a user asks for library-specific information (e.g. Express API usage, React hooks, Vite configuration, or TypeScript language features), **always fetch the latest official docs via Context7** before answering:

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
