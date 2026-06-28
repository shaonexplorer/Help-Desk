# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Help-Desk is a full-stack ticketing app in **early scaffold stage**. The monorepo is set up and runs. Auth is fully wired end-to-end (Better Auth server + client SDK, login page, route protection, reactive sessions). The server is organized as a **modular MVC** (a shared `core/` kernel plus self-contained feature `modules/` composed in `index.ts`). The crew users domain exists (list + detail + create, admin/agent roles). The ticket domain exists (list + detail + create endpoints; blotter page with TanStack Table, incident file detail page, dispatch form creation page); ticket status-update and reassignment flow are not yet built.

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
│  └─ schema.prisma       ← DB schema (User + Role enum, TicketPriority enum, TicketStatus enum, Ticket, Session, Account, Verification)
│
├─ client/                 ← React UI (Vite + TypeScript)
│  ├─ src/
│  │  ├─ main.ts            ← React entry: StrictMode + QueryProvider + App
│  │  ├─ App.tsx            ← Root: AuthProvider + BrowserRouter + Routes
│  │  ├─ api/               ← Per-domain API modules (mirrors server modules)
│  │  │  ├─ index.ts        ← Barrel re-export of all API functions/types
│  │  │  ├─ users.ts        ← fetchUsers, fetchUser, createUser, updateUser, deleteUser, reactivateUser, RosterUser, Role, CreateUserInput
│  │  │  ├─ tickets.ts      ← fetchTickets, createTicket, Ticket, TicketWithUsers, TicketUser, TicketPriority, TicketCategory, TicketStatus, CreateTicketInput
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
│  │       ├─ app-shell.tsx       ← Shared navbar (brand + Dashboard/Tickets/Crew nav + sign out)
│  │       ├─ login-page.tsx      ← Split-panel login layout
│  │       ├─ login-form.tsx      ← Login form (react-hook-form + zod + authClient.signIn)
│  │       ├─ dashboard.tsx       ← Authenticated home (health probe via useQuery)
│  │       ├─ users-list-page.tsx ← Crew roster table (roles, presence, soft-delete + reactivate actions, useQuery)
│  │       ├─ confirmation-dialog.tsx ← Reusable overlay dialog (destructive + confirm variants)
│  │       ├─ create-user-page.tsx← Dispatch card for adding a new crew member
│  │       ├─ create-user-form.tsx← react-hook-form + zod (name, email, password, role)
│  │       ├─ create-ticket-page.tsx← Dispatch card for opening a new ticket
│  │       ├─ create-ticket-form.tsx← react-hook-form + zod (subject, description, priority, category, assignedToId)
│  │       ├─ tickets-list-page.tsx ← Ticket blotter with TanStack Table (sorting, filtering, pagination)
│  │       ├─ ticket-detail-page.tsx ← Incident file view (blotter header, description reader, metadata rail)
│  │       ├─ protected-route.tsx ← Redirects to /login if no session
│  │       ├─ public-route.tsx    ← Redirects to / if already logged in
│  │       └─ ui/                 ← shadcn-style components (Button, Input, Label, Table)
│  ├─ index.html             ← Vite entry, mounts #app
│  ├─ vite.config.ts         ← React plugin, Tailwind, @ alias, /api proxy
│  ├─ tsconfig.json          ← extends base, bundler moduleResolution, path alias
│  └─ package.json           ← React 19, Vite 8, Tailwind v4, shadcn, axios, @tanstack/react-query, @tanstack/react-table
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
   │  │     ├─ user.model.ts      ← Prisma access + ROSTER_SELECT allow-list + createUser (Better Auth sign-up)
   │  │     ├─ user.validation.ts ← validateIdParam + validateCreateUserBody + ValidationResult
   │  │     ├─ user.controller.ts ← UserController.list / getById / create (asyncHandler + HttpError)
   │  │     ├─ user.route.ts      ← mountUsers(router)
   │  │     └─ index.ts           ← exports usersModule: Mountable
   │  ├─ modules/tickets/
   │  │  ├─ ticket.model.ts      ← Prisma access + TICKET_SELECT + USER_MINI_SELECT + TicketModel.list / createTicket
   │  │  ├─ ticket.validation.ts ← TICKET_CATEGORIES allowlist + validateCreateTicketBody + ValidationResult
   │  │  ├─ ticket.controller.ts ← TicketController.list / create (asyncHandler + HttpError)
   │  │  ├─ ticket.route.ts      ← mountTickets(router)
   │  │  └─ index.ts             ← exports ticketsModule: Mountable
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
| `GET /api/users` | users | Full crew roster, most-recent first. Returns `{ users: RosterUser[] }`. Soft-deleted users are included with `deletedAt` set so the client can render a "deactivated" badge. |
| `GET /api/users/:id` | users | Single crew member. Returns `{ user }`, or 404 `{ error }` if not found. |
| `POST /api/users` | users | Create a new crew member. Body: `name`, `email`, `password`, `role?` (defaults to AGENT). Routes through Better Auth sign-up. Returns 201 `{ user }`, 400 `{ error }` on validation failure, 409 `{ error }` if email already exists. |
| `DELETE /api/users/:id` | users | Soft-delete a crew member. Stamps `deletedAt` and **deletes the target's session rows** so their cookies stop working immediately. Returns 403 `{ error }` for admin targets, 404 `{ error }` if already deleted or missing. Returns `{ user }` with `deletedAt` set on success. |
| `POST /api/users/:id/reactivate` | users | Reactivate a soft-deleted crew member. Clears `deletedAt`. Returns 400 `{ error }` if the user isn't currently deleted, 404 `{ error }` if not found. Returns `{ user }` with `deletedAt: null` on success. |
| `GET /api/tickets` | tickets | List all tickets, newest first, with `createdBy` and `assignedTo` user names resolved. Returns `{ tickets: TicketWithUsers[] }`. |
| `GET /api/tickets/:id` | tickets | Single ticket with `createdBy` and `assignedTo` user names resolved. Returns `{ ticket: TicketWithUsers }`, or 404 `{ error }` if not found. |
| `POST /api/tickets` | tickets | Create a new ticket. Body: `subject`, `description`, `priority?` (defaults to MEDIUM), `category`, `assignedToId?`. `createdById` is set from the session. Returns 201 `{ ticket }`, 400 `{ error }` on validation failure or invalid `assignedToId`. |

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
- `authClient.signIn.email({ email, password }, { onSuccess, onError })` — the `onError` callback receives a `BetterFetchError` whose parsed JSON body is at `ctx.error.error` (shape `{ error: string }`). **There is no `code` property** — read the message from `ctx.error.error?.error`, falling back to `ctx.error.message`.
- `authClient.signOut()` — clears the session cookie
- `authClient.useSession()` — reactive hook returning `{ data, isPending, isRefetching, error, refetch }`. Re-fetches automatically after sign-in/sign-out.
- `authClient.getSession()` — imperative fetch (for route guards / loaders)

**Error handling** (`client/src/lib/auth-errors.ts`): Maps Better Auth error codes to user-facing strings. The `messageFor(code)` helper is kept for reference but is no longer used by the login form — the server now sends the human-readable message directly in the JSON body, so the form reads it from `ctx.error.error?.error` instead of mapping a code.

### Client Auth Flow

1. `AuthProvider` (`client/src/lib/auth.tsx`) wraps the app and exposes `{ user, loading, refresh }` via `useAuth()`.
2. `ProtectedRoute` (`client/src/components/protected-route.tsx`) redirects unauthenticated users to `/login` with `state={{ from: location }}`.
3. `PublicRoute` (`client/src/components/public-route.tsx`) redirects authenticated users away from `/login` to `/`.
4. After successful sign-in, `LoginForm` calls `authClient.signIn.email()` → `onSuccess` navigates to `from` (or `/`). On failure, the `onError` callback reads the server's message from `ctx.error.error?.error` and displays it. `useSession()` re-fetches automatically — no manual `refresh()` needed.
5. After sign-out, `AppShell` calls `authClient.signOut()` → navigates to `/login`. `useSession()` clears automatically.

### Client API Layer

Data fetching uses **axios** (`lib/api-client.ts`) plus **TanStack Query** (`lib/query-client.tsx`). The `api/` folder is split per domain to mirror the server's `modules/`:

- `api/users.ts` — `fetchUsers()`, `fetchUser(id)`, `createUser(input)`, `updateUser(id, input)`, `deleteUser(id)`, `reactivateUser(id)`, and the `RosterUser` / `Role` / `CreateUserInput` / response types.
- `api/tickets.ts` — `fetchTickets()`, `createTicket(input)`, and the `Ticket` / `TicketWithUsers` / `TicketUser` / `TicketPriority` / `TicketCategory` / `TicketStatus` / `CreateTicketInput` / response types.
- `api/health.ts` — `fetchHello()`.
- `api/index.ts` — barrel re-export, so components import from `@/api`.

The shared axios instance uses an empty `baseURL` (relative requests — Vite proxy in dev, same-origin in prod) and `withCredentials: true` to carry the session cookie. The `QueryClient` defaults to a 30s stale time, a single retry, and no refetch-on-window-focus.

#### Axios + TanStack Query conventions

- **Read calls** go through `useQuery` with a stable query key (e.g. `["users"]`, `["health"]`).
- **Write calls** (`POST` / `PUT` / `DELETE`) call the `api/` function directly with `await`, then invalidate the relevant query key via `queryClient.invalidateQueries({ queryKey: [...] })` so the affected list refetches.
- **Error handling for writes**: axios rejects with an `AxiosError` on non-2xx. The server's JSON error body is at `err.response.data.error` (a string). Always read that before falling back to `err.message` — the AxiosError's own message is the generic `"Request failed with status code NNN"`, never the server's intent.
- **Error handling for reads**: `useQuery` exposes `isError` and `error`; render an error banner from `error.message` in the page.

These conventions are the standard pattern for all new features — follow them when adding new API endpoints or pages.

Pages call the API through `useQuery` (e.g. `users-list-page.tsx` uses queryKey `["users"]`; `tickets-list-page.tsx` uses `["tickets"]`; `dashboard.tsx` uses `["health"]`). To invalidate after a mutation, call `queryClient.invalidateQueries({ queryKey: [...] })`.

**Users list page** (`users-list-page.tsx`): warm-paper surface (`#F7F6F1`) with ink-blue accents (`#1E3A5F`). The "Add member" link sits in a flex row alongside the search bar — search on the left, add member on the right — so the primary action stays visible without scrolling. The create-user page (`create-user-page.tsx`) uses the same visual identity: a dispatch-board card with monospace eyebrow and a `UserPlus` icon header.

**Tickets list page** (`tickets-list-page.tsx`): built on **TanStack Table v8** (`useReactTable` + `getCoreRowModel` / `getSortedRowModel` / `getFilteredRowModel` / `getPaginationRowModel`). Reads like a **blotter** — a dispatcher's incident log — not a generic data table. The signature typographic move is the monosequence prefix on each row (`TKT-0001` in monospace ink-blue), making every ticket feel like a logbook entry. Columns: Blotter (monospace prefix), Subject (with creator name), Priority (color badge — gray Low/Med, amber High, red-wash Urgent/Crit), Category (chip), Status (green dot + label), Assigned to (name or "Unassigned"), Log (monospace timestamp + relative time). Sorting is available on Subject, Priority, and Log columns (sorted newest-first by default). Global filtering searches across subject, category, creator, and assignee names/emails. Pagination is configurable (10/20/50 per page) with first/prev/next/last controls. The page uses the same warm-paper surface, ink-blue eyebrow, and dispatch-board vocabulary as the crew roster. The "Open ticket" link in the flex row navigates to `/tickets/create`.

**TanStack Table convention** (`tickets-list-page.tsx`): The table is fully headless — TanStack Table provides the data model and sorting/filtering/pagination logic, while the JSX renders a custom flex-row layout (not the shadcn `Table` component). Column definitions use `createColumnHelper<TicketWithUsers>()` with a `SortableHeader` wrapper for clickable sort headers. The `globalFilterFn` is a custom function that searches across multiple fields. This headless + custom-render pattern is the standard for any future table pages — the shadcn `Table` component is used for simple static tables (crew roster), TanStack Table for interactive data views.

### Soft Delete & Reactivate

The crew roster supports soft-delete and reactivation. The `User` Prisma model has a `deletedAt DateTime?` column (indexed). Soft-deleted users are included in the roster with `deletedAt` set so the client renders them with a "Deactivated" badge instead of the presence pulse.

**Server rules** (`server/src/modules/users/user.controller.ts`):
- `DELETE /api/users/:id` — 403 if target is ADMIN, 404 if missing/already-deleted. Stamps `deletedAt` and **deletes the target's `Session` rows** so their cookies stop working immediately.
- `POST /api/users/:id/reactivate` — 400 if not currently deleted, 404 if missing. Clears `deletedAt`.

**Client rules** (`client/src/components/users-list-page.tsx`):
- Delete button (`Trash2`): shown for non-deleted, non-admin users when the current user is an admin. Disabled with tooltip otherwise.
- Reactivate button (`RotateCcw`): shown for deleted users when the current user is an admin.
- Both actions go through `ConfirmationDialog` before firing, then invalidate `["users"]`.
- Inline error banners surface the server's message if either mutation fails.

### Ticket Domain

The ticket domain handles help-desk incidents. Each ticket has a subject, description, priority, category, status, creator, and optional assignee. The Prisma model uses two enums (`TicketPriority`: LOW/MEDIUM/HIGH/URGENT, `TicketStatus`: OPEN) and a plain `String` column for category validated against a code-level allowlist (`TICKET_CATEGORIES` in `ticket.validation.ts`). This avoids a migration every time a category is added; the allowlist can be moved to a DB table later.

**Category allowlist** (`server/src/modules/tickets/ticket.validation.ts`): `BUG`, `FEATURE_REQUEST`, `SUPPORT`, `BILLING`, `OTHER`. A typed union `TicketCategory` is derived from the array and shared with the client. To add a category, update the array in `ticket.validation.ts` and the `CATEGORY_LABELS` map in `tickets-list-page.tsx`.

**Server rules** (`server/src/modules/tickets/ticket.controller.ts`):
- `POST /api/tickets` — validates all fields, rejects invalid `assignedToId` (must reference a live, non-deleted user). `createdById` is always set from the session, never from the client body.
- `GET /api/tickets` — returns all tickets newest-first with `createdBy` and `assignedTo` user names resolved via `USER_MINI_SELECT` (id, name, email). No pagination yet.
- `GET /api/tickets/:id` — returns a single ticket with user relations, or 404 if not found.

**Client rules** (`client/src/components/tickets-list-page.tsx`):
- Clicking a ticket's subject navigates to `/tickets/:id` (the incident file detail page).
- The "Open ticket" link navigates to `/tickets/create`.
- The create form navigates back to `/tickets` on success or cancel.
- Sorting defaults to newest-first (`log` column descending).

**Ticket detail page** (`ticket-detail-page.tsx`): reads like an incident file pulled from a cabinet. The blotter prefix (`TKT-0001`) is the large monospace header — the call number for this case. The subject is the case title. The description lives in a white reading-area card. A compact metadata rail on the right shows status, priority, category, opened-by, assigned-to, and timestamps. A "Back to blotter" link returns to the list page.

## Frontend Notes

- **React 19** with `createRoot` in StrictMode, mounted on `#app`
- **React Router DOM v7** for client-side routing (`BrowserRouter` in `App.tsx`)
- **Tailwind v4** using `@theme inline` design tokens in `style.css` (new v4 style, no `tailwind.config.js`)
- **shadcn v4** components go in `client/src/components/ui/` — add with `npx shadcn@latest add <component>`
- **Path alias**: `@/` maps to `client/src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- **UI components**: `Button`, `Input`, `Label`, `Table` (all shadcn-style; `Table` wraps native table elements)
- **Form patterns**: All forms use `react-hook-form` + `zod` with `@hookform/resolvers`. The login form (email + password) and the create-user form (name, email, password, role) both follow the same field markup pattern: `<Label>` + `<Input>` + error `<p>`. On mutation success, invalidate the relevant query and navigate. Pin `zod` to v3 and `@hookform/resolvers` to v4 — the resolver v5 requires zod v4's standard-schema shape and will fail to type-check against v3 schemas.
- **Table patterns**: Simple static tables use the shadcn `Table` component (see `users-list-page.tsx`). Interactive data views with sorting, filtering, or pagination use **TanStack Table v8** headless (`useReactTable` + `getCoreRowModel` / `getSortedRowModel` / `getFilteredRowModel` / `getPaginationRowModel`) with custom JSX rendering (see `tickets-list-page.tsx`). TanStack Table v8 stable uses `useReactTable` with `get*RowModel()` functions — not the v9 beta `useTable` + `tableFeatures` API.

## Admin Seed

`server/src/scripts/seed-admin.ts` seeds an admin user (`admin@gmail.com` / `password123`, role `ADMIN`) on server boot. It is invoked from `server/src/index.ts` before `app.listen`, so the admin is guaranteed to exist before the first request is served.

- Idempotent: re-running updates the existing user's role instead of duplicating.
- Uses Better Auth's own sign-up handler (synthetic `Request` via `auth.handler`) so the password hash and linked `Account` row are created exactly as the client sign-in flow expects — no manual hashing.
- The role is set via a direct Prisma update after sign-up, since the Better Auth sign-up endpoint doesn't accept custom fields.
- On failure, `process.exitCode = 1` is set but the server still starts listening — a transient DB hiccup during boot shouldn't leave the app dead.

To run manually: `npm run seed --workspace=server`.

## Known Gaps / TODOs

- **No ticket status-update flow** — tickets can be viewed and created, but there is no UI to change status (e.g. IN_PROGRESS, RESOLVED, CLOSED) or reassign yet
- **No tests** — no test framework installed
- **No git repo** — no `.git`, no commits, no `.gitignore`
- **No README** — only this CLAUDE.md documents the project
- **No role management UI** — users have an admin/agent role (DB + API + table badge), but there's no interface to change a role yet
- **No public sign-up page** — an admin can create crew members via `/users/create`, but there's no self-service public sign-up flow yet

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
- The `onError` callback receives a `BetterFetchError` — the parsed JSON body is at `ctx.error.error` (shape `{ error: string }`), **not** `ctx.error.code`. Read the message from `ctx.error.error?.error`, falling back to `ctx.error.message`. Do not cast `ctx.error.code` — the property does not exist on `BetterFetchError`.

---

*(End of CLAUDE.md)*
