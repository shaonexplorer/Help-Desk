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
   - Full CRUD for tickets (create, read, update, delete, soft-delete, restore)  
   - ticket **status flow:** `OPEN → IN_PROGRESS → RESOLVED → CLOSED`  
   - Priority levels: `LOW`, `MEDIUM`, `HIGH`, `URGENT`  
   - Category tags: `BUG`, `FEATURE_REQUEST`, `SUPPORT`, `BILLING`, `OTHER`  
   - Assignment to agents (including unassign)  
   - Inbound email integration via Better Auth  

3. **Authentication Flows**
   - Email / password sign‑up, sign‑in, password reset, email verification, account recovery  
   - Social login with Google / GitHub / etc. (via Better Auth)  

4. **Real-Time Updates (Socket.IO)**
   - Server-side Socket.IO integration for real-time ticket updates
   - Client-side socket connection management with automatic reconnection
   - Event broadcasting to rooms (`tickets`, `dashboard`) for efficient updates
   - Automatic ticket list refetching when events are received
   - Connection to Express server on port 5000 in development mode

### Server-Side Socket.IO Setup
- **File:** `server/src/index.ts`
- **Socket Instance:** Exported as `io` for use in controllers
- **Events:** `ticket:created`, `ticket:updated`, `ticket:deleted`, `ticket:restored`, `ticket:assignment-changed`
- **Rooms:** `tickets` (for ticket list updates), `dashboard` (for analytics)

### Client-Side Socket.IO Setup
- **File:** `client/src/lib/socket-client.ts`
- **Connection:** In development, connects to `http://localhost:5000`; in production uses same origin
- **Reconnection:** 5 attempts with 1s-5s exponential backoff
- **Functions:** `initSocket()`, `onTicketEvent()`, `onTicketEventNoData()`, `subscribeToTickets()`, `unsubscribeFromTickets()`, `joinDashboardRoom()`, `leaveDashboardRoom()`

### Real-Time Ticket List Updates
- **File:** `client/src/components/tickets-list-page.tsx`
- **Implementation:** Socket connection initialized on component mount
- Subscribes to `ticket:created` and `ticket:updated` events
- Invalidates/refetches TanStack Query cache when events received
- Proper cleanup on component unmount

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
- `DELETE /api/tickets/:id` – Soft-delete a ticket  

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

## Recent Changes (Socket.IO Real-Time Updates)

**Server‑Side Files**
- `server/src/index.ts` – Added Socket.IO server setup with room management and event broadcasting
- `server/src/modules/tickets/ticket.controller.ts` – Added `io.emit()` calls after ticket create/update operations

**Client‑Side Files**
- `client/src/lib/socket-client.ts` – New file: Socket.IO client service with connection management and event helpers
- `client/src/components/tickets-list-page.tsx` – Added socket subscription and query refetching for real-time updates

**Dependencies Added**
- `socket.io` (server)
- `socket.io-client` (client)
- `@types/socket.io-client` (dev)

## Recent Changes (Customer Reply Notifications)

**Feature Overview**
Added a notification system that alerts agents/admins when a customer replies to an open/in_progress ticket. Notifications appear as toast messages in the top-right corner, and unread tickets are highlighted in the ticket list.

**Server‑Side API**
- When a customer replies via email to an existing open/in_progress ticket, the webhook controller emits a `ticket:customer-replied` Socket.IO event
- Only emits notifications for tickets with status `OPEN` or `IN_PROGRESS`
- Event payload: `{ ticketId, ticketSubject, senderEmail, senderName }`

**Server‑Side Files Modified**
- `server/src/modules/webhooks/webhook.controller.ts` – Added `ticket:customer-replied` event emission when customer replies
- `server/src/modules/webhooks/webhook.model.ts` – Exported `extractNameFromEmail()` function for use in controller

**Client‑Side Implementation**
- Created notification context provider with toast-style notifications
- Notifications auto-dismiss after 10 seconds (toast UI only)
- Unread ticket IDs are tracked in a persistent Set (separate from notifications)
- Unread status persists even after notification toast clears
- Visual indicator: Unread tickets shown with bold font in the subject column
- Tickets marked as read when clicked or when viewing ticket detail page

**Client‑Side Files Created/Modified**
- `client/src/components/notification-context.tsx` – New file: Notification context provider with toast UI
- `client/src/lib/socket-client.ts` – Added `CustomerReplyNotification` type and `onCustomerReply()` function
- `client/src/components/tickets-list-page.tsx` – Added subscription to `ticket:customer-replied` events, visual indicator for unread tickets
- `client/src/components/ticket-detail-page.tsx` – Added `markTicketAsRead()` call when ticket is viewed
- `client/src/App.tsx` – Wrapped app with `NotificationProvider`

**Dependencies Added**
- No new dependencies (uses existing Socket.IO and Lucide React icons)

**Usage**
1. Customer replies to a ticket via email
2. Resend webhook triggers and processes the email
3. If the ticket is OPEN or IN_PROGRESS, a `ticket:customer-replied` event is broadcast
4. Agents see a toast notification with ticket details
5. The ticket is highlighted in the list (bold subject)
6. Clicking the ticket or navigating to its detail page marks it as read

## Recent Changes (AI Reply Polishing)

**Feature Overview**
Added a "Polish" button with AI sparkle icon beside the Send Reply button in the ticket detail page. This allows agents to polish their replies using OpenRouter's AI models before sending.

**Server‑Side API**
- Added `POST /api/tickets/:id/polish` endpoint for polishing reply text using OpenRouter
- Uses OpenRouter's `poolside/laguna-xs-2.1:free` model for cost-effective text polishing
- Returns `{ polished: string }` with the AI-polished version of the reply

**Server‑Side Files Modified**
- `server/src/modules/tickets/ticket.validation.ts` – added `validatePolishReplyBody` validation function
- `server/src/modules/tickets/ticket.controller.ts` – added `polish` handler method
- `server/src/modules/tickets/ticket.route.ts` – added `POST /tickets/:id/polish` route

**Client‑Side API**
- Added `polishReply` function in `client/src/api/tickets.ts`
- Added `TicketPolishResponse` type
- Exported new function and type in `client/src/api/index.ts`

**Client‑Side Files Modified**
- `client/src/components/ticket-detail-page.tsx` – added polish button with sparkle icon, `isPolishing` state, and `handlePolish` function

**Dependencies Added**
- `@ai-sdk/react` (client)
- `@ai-sdk/provider` (client)

**Environment Configuration**
- Added `OPENROUTER_API_KEY` to `server/.env` and `server/.env.example`
- Users must obtain an API key from https://openrouter.ai/keys to use this feature

**Usage**
1. Type a reply in the textarea
2. Click the **Polish** button (sparkle icon)
3. The reply content is sent to OpenRouter for polishing
4. The polished text replaces the original content in the textarea
5. Click **Send Reply** to send the polished message

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

- `server/src/modules/tickets/ticket.validation.ts` – added `validatePolishReplyBody` validation
- `server/src/modules/tickets/ticket.controller.ts` – added polishing endpoint
- `server/src/modules/tickets/ticket.route.ts` – added polish route
- `server/.env` – added OPENROUTER_API_KEY placeholder
- `server/.env.example` – added OPENROUTER_API_KEY documentation
- `client/src/api/tickets.ts` – added polishReply function and type
- `client/src/api/index.ts` – exported new function and type
- `client/src/components/ticket-detail-page.tsx` – added polish button UI

## Recent Changes (Ticket Priority Update)

**Feature Overview**
Added the ability to update a ticket's priority directly from the ticket detail page. The priority dropdown mirrors the existing status dropdown pattern with a button that opens a popover menu showing all four priority levels.

**Server‑Side API**
- Updated `PATCH /api/tickets/:id` endpoint to accept `priority` field in the request body
- Added validation for priority values (LOW, MEDIUM, HIGH, URGENT)
- Priority changes are persisted to the database and broadcast via Socket.IO

**Server‑Side Files Modified**
- `server/src/modules/tickets/ticket.validation.ts` – added `priority` validation to `validateUpdateTicketBody`
- `server/src/modules/tickets/ticket.model.ts` – added `priority` to `UpdateTicketInput` type and `updateTicket` method
- `server/src/modules/tickets/ticket.controller.ts` – added priority handling in `update` handler

**Client‑Side API**
- Updated `UpdateTicketInput` type in `client/src/api/tickets.ts` to include `priority?: TicketPriority`

**Client‑Side Files Modified**
- `client/src/components/ticket-detail-page.tsx` – replaced static priority display with interactive dropdown

**UI Implementation**
- Priority button shows current priority with colored indicator dot
- Clicking opens dropdown with all four priority options
- Each option shows a colored dot matching the priority style
- Selected priority is highlighted with a checkmark
- Dropdown closes on Escape key press or clicking outside
- Real-time updates sync with TanStack Query cache

**Usage**
1. Open a ticket in the detail view
2. Click the Priority field in the metadata rail
3. Select a new priority from the dropdown
4. The change is applied immediately and synced across all open ticket lists

</details>