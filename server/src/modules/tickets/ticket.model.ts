import prisma from '../../prisma';
import type { TicketListQuery } from './ticket.validation';
import { Prisma } from '@prisma/client';

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

export type TicketsListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * Ticket model — the only place that talks to Prisma about tickets. Controllers
 * call these methods; they never import prisma directly. Keeping every query
 * here means the data rules (what's exposed, how defaults are applied, etc.)
 * live in one spot.
 */
export const TicketModel = {
  /**
   * Paginated, sorted, filtered ticket list. Accepts a validated
   * `TicketListQuery` and returns a page of tickets plus metadata for
   * pagination controls. All filtering, sorting, and pagination is done
   * server-side — the client only renders what comes back.
   */
  async paginatedList(
    query: TicketListQuery,
  ): Promise<{ tickets: TicketWithUsers[]; meta: TicketsListMeta }> {
    const { page, limit, sort, order, priority, category, assignee, search } = query;

    // Build the where clause from filters.
    const where: Prisma.TicketWhereInput = {};

    if (priority && priority.length > 0) {
      where.priority = { in: priority };
    }

    if (category && category.length > 0) {
      where.category = { in: category };
    }

    if (assignee) {
      if (assignee === '__unassigned__') {
        where.assignedToId = null;
      } else {
        where.assignedToId = assignee;
      }
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { createdBy: { name: { contains: search, mode: 'insensitive' } } },
        { createdBy: { email: { contains: search, mode: 'insensitive' } } },
        { assignedTo: { name: { contains: search, mode: 'insensitive' } } },
        { assignedTo: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy from sort + order.
    const orderBy: Prisma.TicketOrderByWithRelationInput = {
      [sort]: order,
    };

    // Count total matching rows (for pagination metadata).
    const total = await prisma.ticket.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Fetch the page.
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        ...TICKET_SELECT,
        createdBy: { select: USER_MINI_SELECT },
        assignedTo: { select: USER_MINI_SELECT },
      },
    });

    return {
      tickets,
      meta: { page, limit, total, totalPages },
    };
  },

  /**
   * Find a single ticket by id, with creator and assignee names resolved.
   * Returns null if the ticket doesn't exist.
   */
  async findById(id: string): Promise<TicketWithUsers | null> {
    return prisma.ticket.findUnique({
      where: { id },
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
