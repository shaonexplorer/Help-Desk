# Help Desk

A full-stack ticketing application built with React, Express, and Prisma. Designed to manage customer support tickets with real-time updates, role-based access control, and email integration.

## 🏗️ Architecture

```
Help-Desk/
├── client/                 # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components (shadcn/ui)
│   │   ├── lib/           # Utilities and socket client
│   │   └── App.tsx        # Router and app setup
│   └── vite.config.ts     # Vite config with proxy
│
├── server/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── modules/       # Feature modules (tickets, users, auth, etc.)
│   │   ├── middleware/    # Auth and error handling
│   │   ├── core/          # Router composition utilities
│   │   ├── index.ts       # Server entry point
│   │   └── auth.ts        # Better Auth configuration
│   └── package.json       # Server dependencies
│
├── prisma/                # Database schema and migrations
├── .claude/               # Claude configuration
└── package.json           # Workspace configuration
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Express, TypeScript, Prisma ORM, PostgreSQL |
| **Authentication** | Better Auth (email/password + OAuth) |
| **Real-time** | Socket.IO |
| **UI Components** | shadcn/ui, lucide-react, recharts |
| **State Management** | TanStack Query, React Hook Form |
| **Forms** | React Hook Form, Zod validation |
| **Charts** | Recharts |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database
- **Resend** account (for email integration)
- **OAuth provider credentials** (Google, GitHub, etc. - optional)
- **OpenRouter API key** (optional, for AI polishing feature)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Copy server environment
cp server/.env.example server/.env

# Copy client environment
cp client/.env.example client/.env.development

# Edit .env files with your configuration
```

### Environment Configuration

#### Server (`server/.env`)

```env
# PostgreSQL database URL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# Better Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET="your-secret-key"

# Server URL (used for cookies, webhooks)
BETTER_AUTH_URL=http://localhost:5000
PORT=5000

# CORS origins (comma-separated)
CORS_ORIGIN=http://localhost:3000

# Resend API (for inbound email integration)
RESEND_API_KEY=your-resend-api-key
RESEND_WEBHOOK_SECRET=your-webhook-secret
RESEND_FROM_EMAIL=notifications@yourdomain.com

# OpenRouter API key (optional, for AI polishing)
OPENROUTER_API_KEY=your-openrouter-key

# OAuth Configuration (Google, GitHub, etc.)
CLIENT_ID=your-oauth-client-id
CLIENT_SECRET=your-oauth-client-secret
REDIRECT_URI=http://localhost:5000/api/auth/callback/google
REFRESH_TOKEN=your-oauth-refresh-token
```

#### Client (`client/.env.development`)

```env
# Base URL for the Better Auth server. Leave empty to use Vite dev proxy
# which forwards /api → server. In production, set to your public server URL.
VITE_AUTH_BASE_URL=
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate --workspace=server

# Run migrations
npm run prisma:migrate --workspace=server

# Seed admin user (optional)
npm run seed --workspace=server
```

### Development

```bash
# Run both client and server in development mode
npm run dev

# Client will be available at http://localhost:3000
# Server API at http://localhost:5000
```

### Production Build

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

## 🔐 Authentication

The application uses **Better Auth** for authentication with the following features:

- **Email/Password**: Sign up, sign in, password reset, email verification
- **OAuth Providers**: Google, GitHub, and other OAuth providers (requires API keys)
- **Session Management**: Persistent sessions with 1-year "remember me" option
- **Role-Based Access**: `USER`, `AGENT`, `ADMIN` roles

### OAuth Setup

To enable OAuth login providers, you need to:

1. Register your application with the OAuth provider (e.g., Google Cloud Console)
2. Add the OAuth credentials to `server/.env`:
   - `CLIENT_ID` - OAuth client ID
   - `CLIENT_SECRET` - OAuth client secret
   - `REDIRECT_URI` - Callback URL (e.g., `http://localhost:5000/api/auth/callback/google`)
   - `REFRESH_TOKEN` - OAuth refresh token (if required)

### User Roles

| Role | Permissions |
|------|-------------|
| **USER** | Create tickets, view own tickets |
| **AGENT** | All user permissions, assign tickets, update ticket status |
| **ADMIN** | All agent permissions, manage users, full system access |

## 🎫 Ticket System

### Ticket Status Flow
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
                ↘____↗
```

### Priority Levels
- `LOW` - Low priority
- `MEDIUM` - Medium priority
- `HIGH` - High priority
- `URGENT` - Urgent priority

### Categories
- `BUG` - Bug reports
- `FEATURE_REQUEST` - Feature requests
- `SUPPORT` - General support
- `BILLING` - Billing questions
- `OTHER` - Other issues

### Features
- Create, read, update tickets
- Assign tickets to agents
- Search and filter by status, priority, category, assignee
- Message history with inbound email integration
- Real-time updates via Socket.IO
- AI-powered reply polishing (via OpenRouter)

## 📡 API Endpoints

All API routes are prefixed with `/api/`.

### Authentication
- `POST /api/auth/sign-up` - Create new user
- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-out` - Sign out
- `POST /api/auth/refresh-session` - Refresh session
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Tickets
- `GET /api/tickets` - List tickets (with filtering, sorting, pagination)
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets/:id` - Get ticket details with messages
- `PATCH /api/tickets/:id` - Update ticket (status, priority, assignment)
- `POST /api/tickets/:id/reply` - Add message to ticket
- `GET /api/tickets/:id/messages` - Get ticket message history
- `POST /api/tickets/:id/polish` - AI polish reply text

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft-delete user
- `POST /api/users/:id/reactivate` - Restore soft-deleted user

### Dashboard
- `GET /api/dashboard` - Get analytics data

### Health
- `GET /api/health` - Health check endpoint

## 🔄 Real-Time Updates

The application uses Socket.IO for real-time updates:

### Server Events
- `ticket:created` - New ticket created
- `ticket:updated` - Ticket updated (status, priority, assignment)
- `ticket:customer-replied` - Customer replied to ticket (via email webhook)

### Client Features
- Automatic reconnection with exponential backoff
- Room-based subscriptions (`tickets`, `dashboard`)
- TanStack Query cache invalidation on events
- Toast notifications for customer replies

## 📧 Email Integration

The application integrates with **Resend** for inbound email support:

1. Customers can reply to ticket emails
2. Webhook processes inbound emails
3. Messages are added to ticket history
4. Agents are notified via Socket.IO

## 🤖 AI Reply Polishing

Optional feature to polish agent replies using OpenRouter:

1. Type a reply in the textarea
2. Click the **Polish** button (sparkle icon)
3. The reply is sent to OpenRouter for polishing
4. Polished text replaces the original content

**Note**: Requires `OPENROUTER_API_KEY` environment variable.

## 📁 Project Structure

### Server Modules
- `modules/tickets/` - Ticket CRUD, validation, model
- `modules/users/` - User management
- `modules/dashboard/` - Analytics endpoint
- `modules/webhooks/` - Resend webhook handler
- `middleware/auth.ts` - Authentication middleware
- `middleware/errorHandler.ts` - Error handling middleware

### Client Components
- `tickets-list-page.tsx` - Ticket list with filters
- `ticket-detail-page.tsx` - Ticket detail with conversation thread
- `create-ticket-page.tsx` - New ticket form
- `users-list-page.tsx` - User management
- `notification-context.tsx` - Toast notifications
- `socket-client.ts` - Socket.IO client service

## 🧪 Development Scripts

```bash
# Root level
npm run dev              # Run client and server in parallel
npm run build            # Build both client and server
npm run build:client     # Build frontend only
npm run build:server     # Build backend only
npm start                # Start production server

# Client only
npm run dev --workspace=client
npm run build --workspace=client
npm run preview --workspace=client

# Server only
npm run dev --workspace=server
npm run build --workspace=server
npm run seed --workspace=server

# Prisma
npm run prisma:generate --workspace=server
npm run prisma:migrate --workspace=server
```

## 🎨 UI Components

The project uses **shadcn/ui** with the following component categories:

- **Forms**: Input, Button, Select, Textarea, Form, etc.
- **Layout**: Card, Separator, Sheet, Sidebar
- **Data Display**: Table, Badge, Avatar
- **Navigation**: Breadcrumb, Dropdown Menu
- **Feedback**: Toast, Alert Dialog, Confirmation Dialog

## 🔧 Configuration

### Tailwind CSS
- Base color: `neutral`
- CSS variables enabled
- Custom animations via `tw-animate-css`

### TypeScript
- Strict mode enabled
- Path aliases configured (`@/` maps to `src/`)
- Module resolution: Node.js

### Vite
- React plugin enabled
- Tailwind CSS plugin enabled
- Dev server port: 3000
- API proxy: `/api/*` → `http://localhost:5000`

## 📊 Dashboard

The dashboard page displays analytics including:
- Total tickets
- Tickets by status
- Tickets by priority
- Recent activity

## 🛡️ Security Features

- CORS configured for development origins
- Credentials enabled for cookie-based auth
- Route protection via `ProtectedRoute` and `PublicRoute` components
- Session verification middleware
- Soft-delete pattern for data integrity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests/linting
5. Submit a pull request

## 📄 License

ISC

## 🙏 Acknowledgments

- [Better Auth](https://better-auth.com/) - Authentication framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Socket.IO](https://socket.io/) - Real-time communication
- [Prisma](https://www.prisma.io/) - ORM
- [Vite](https://vitejs.dev/) - Build tool