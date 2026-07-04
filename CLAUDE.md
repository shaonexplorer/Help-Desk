# Help-Desk Project – CLAUDE.md

## Project Overview
Help-Desk is a full‑stack ticketing application built with:
- **Frontend:** React (Vite) + TypeScript + Tailwind CSS + shadcn/ui components  
- **Backend:** Node.js (Express) + TypeScript + Prisma ORM + PostgreSQL  
- **Authentication:** Better Auth (email/password + OAuth providers)  
- **Database:** Prisma with PostgreSQL driver  
- **ORM Models:** Users, Sessions, Accounts, Verifications, Sessions, Tickets, Attachments  

## Key Features
1. **User Management**
   - Roles: `USER`, `AGENT`, `ADMIN`  
   - Soft‑delete / restore users  
   - Session management with persistent login (1‑year remember me)  
   - OAuth & SSO support  

2. **Ticket System**
   - Full CRUD for tickets (create, read, update, delete, soft‑delete, restore)  
   - ticket **status flow:** `OPEN → IN_PROGRESS → RESOLVED → CLOSED`  
   - Priority levels: `LOW`, `MEDIUM`, `HIGH`, `URGENT`  
   - Category tags: `BUG`, `FEATURE_REQUEST`, `SUPPORT`, `BILLING`, `OTHER`  
   - Assignment to agents (including unassign)  
   - Inbound email integration via Better Auth  

3. **Authentication Flows**
   - Email / password sign‑up, sign‑in, password reset, email verification, account recovery  
   - Social login with Google / GitHub / etc. (via Better Auth)  

4. **Developer Experience**
   - Monorepo with separate `client` and `server` workspaces  
   - Shared TypeScript types & validation schemas  
   - ESLint + Prettier + Git hooks  
   - Docker / npm scripts for local dev and production builds  

## Development Workflow
```bash
# Install dependencies
npm install

# Run both client and server in watch mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Documentation
All API routes are prefixed with `/api/*`.  
Examples:
- `GET /api/tickets` – List tickets (supports filtering, sorting, pagination)  
- `POST /api/tickets` – Create a new ticket  
- `PATCH /api/tickets/:id` – Update ticket status or assignment  
- `DELETE /api/tickets/:id` – Soft‑delete a ticket  

## Extending the Project
- Add new ticket categories or statuses by updating `TICKET_CATEGORIES` / `TICKET_STATUSES` enums.  
- Extend authentication with additional providers via Better Auth.  
- Implement webhook integrations for external ticketing systems.  

---

## Recent Changes (Status Filtering)

**Server‑Side Support**
- Added `status?: TicketStatus[]` to the `TicketListQuery` type.
- Enhanced query validation to parse comma‑separated status values and reject invalid entries.
- Updated `TicketModel.paginatedList` to include `where.status = { in: status }` when filtering by status.
- Validation now returns `ok`/`fail` objects consistent with the existing pattern.

**Client‑Side UI**
- Introduced status filter pills in `client/src/components/tickets-list-page.tsx` mirroring the existing priority/category chips.
- Added `toggleStatus` callback to manage multiple selection.
- Integrated the new pills into the filter bar, preserving the existing layout and styling.
- The filter works together with priority, category, assignee, and search filters.

**Documentation Update**
This file (`CLAUDE.md`) now includes a “Recent Changes (Status Filtering)” section describing the backend and frontend enhancements.

---

## Recent Changes (Ticket Reply & Message History)

**Database Schema**
- Added `TicketMessage` model with `INBOUND_EMAIL`, `AGENT_REPLY`, `AUTOMATED_REPLY` message types.
- Added `messages` relation to the `Ticket` model with cascade delete.
- Migration: `add-ticket-messages`

**Server‑Side API**
- Added `POST /api/tickets/:id/reply` endpoint for adding messages to tickets.
- Added `GET /api/tickets/:id/messages` endpoint for fetching message history.
- Auto-updates ticket status to `IN_PROGRESS` when agent replies to `OPEN` tickets.
- Validation: content required (max 10,000 chars), messageType enum, optional sender details.

**Server‑Side Files Modified**
- `prisma/schema.prisma` – added `TicketMessage` model and relation
- `server/src/modules/tickets/ticket.validation.ts` – added `validateCreateTicketMessageBody`
- `server/src/modules/tickets/ticket.model.ts` – added `addMessage`, `getMessages`, `findByIdWithMessages`
- `server/src/modules/tickets/ticket.controller.ts` – added `reply` and `getMessages` handlers
- `server/src/modules/tickets/ticket.route.ts` – added new routes

**Client‑Side UI**
- Added message history panel with color-coded message bubbles (📨 inbound, 🛡️ agent, 💬 automated).
- Added reply form with character limit and loading state.
- Auto-scroll to new messages on load.
- Fully responsive: stacks vertically on mobile, sidebar on desktop.
- Mobile improvements: `lg:flex-row`, `lg:w-52`, `lg:h-80` breakpoints.

**Client‑Side Files Modified**
- `client/src/api/tickets.ts` – added `replyToTicket`, `fetchTicketMessages`, and related types
- `client/src/api/index.ts` – exported new functions and types
- `client/src/components/ticket-detail-page.tsx` – added conversation thread and reply functionality

<details>
<summary>🔧 Development Scripts (unchanged)</summary>

```json
{
  "dev": "concurrently \"npm:dev --workspace=server\" \"npm:dev --workspace=client\"",
  "build": "npm run build:client && npm run build:server",
  "build:client": "vite build",
  "build:server": "tsc -p server",
  "start": "node server/dist/index.js"
}
```

</details>

<details>
<summary>🛠️ Other Files Modified in This Change</summary>

- `server/src/modules/tickets/ticket.validation.ts` – added `status` handling to query validation.  
- `server/src/modules/tickets/ticket.model.ts` – incorporated `status` filter into the `where` clause.  
- `client/src/components/tickets-list-page.tsx` – added status filter pills and toggle logic.  

</details>