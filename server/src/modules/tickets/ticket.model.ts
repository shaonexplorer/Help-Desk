import prisma from '../../prisma';

/**
 * The fields a ticket response is allowed to expose. Selecting explicitly means
 * a future column added to Ticket never leaks through the API by accident.
 */
export const TICKET_SELECT = {
  id: true,
  subject: true,
  description: true,
  priority: true,
  category: true,
  status: true,
  createdById: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type TicketRow = {
  id: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  status: 'OPEN';
  createdById: string;
  assignedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Minimal user shape for relation includes in list responses. */
const USER_MINI_SELECT = { id: true, name: true, email: true } as const;

type UserMini = { id: string; name: string | null; email: string };

/** A ticket with its creator and assignee names resolved. */
export type TicketWithUsers = TicketRow & {
  createdBy: UserMini;
  assignedTo: UserMini | null;
};

export type CreateTicketInput = {
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  assignedToId?: string | null;
};

/**
 * Ticket model — the only place that talks to Prisma about tickets. Controllers
 * call these methods; they never import prisma directly. Keeping every query
 * here means the data rules (what's exposed, how defaults are applied, etc.)
 * live in one spot.
 */
export const TicketModel = {
  /**
   * List all tickets, newest first. Includes the creator and assignee names
   * so the list view can show "Opened by X" and "Assigned to Y" without
   * N+1 client lookups.
   */
  async list(): Promise<TicketWithUsers[]> {
    return prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        ...TICKET_SELECT,
        createdBy: { select: USER_MINI_SELECT },
        assignedTo: { select: USER_MINI_SELECT },
      },
    });
  },

  /**
   * Create a new ticket. `createdById` is always set from the authenticated
   * session — the client never sends it.
   */
  async createTicket(
    input: CreateTicketInput,
    createdById: string,
  ): Promise<TicketRow> {
    return prisma.ticket.create({
      data: {
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        category: input.category,
        assignedToId: input.assignedToId ?? null,
        createdById,
      },
      select: TICKET_SELECT,
    });
  },
};
