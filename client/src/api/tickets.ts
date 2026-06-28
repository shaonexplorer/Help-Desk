import { apiClient } from "@/lib/api-client";

/** Ticket priority levels. Kept in sync with the Prisma TicketPriority enum. */
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** Ticket category values. Kept in sync with the server-side allowlist. */
export type TicketCategory =
  | "BUG"
  | "FEATURE_REQUEST"
  | "SUPPORT"
  | "BILLING"
  | "OTHER";

/** Ticket status. Currently only OPEN on creation. */
export type TicketStatus = "OPEN";

/** Minimal user shape included in ticket list responses. */
export interface TicketUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * A single ticket as returned by the list endpoint, with the creator and
 * assignee names resolved for display.
 */
export interface TicketWithUsers {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
}

/**
 * A single ticket as returned by the create endpoint (no user relations).
 * Mirrors the Ticket model fields the server chooses to expose.
 */
export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketsResponse {
  tickets: TicketWithUsers[];
}

export interface TicketResponse {
  ticket: Ticket;
}

/** Payload for creating a new ticket. Priority defaults to MEDIUM on the server. */
export interface CreateTicketInput {
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  assignedToId?: string;
}

/**
 * Fetch all tickets, newest first. Returns tickets with the creator and
 * assignee names resolved so the list page can display them without N+1
 * client lookups.
 */
export async function fetchTickets(): Promise<TicketsResponse> {
  const { data } = await apiClient.get<TicketsResponse>("/api/tickets");
  return data;
}

/**
 * Create a new ticket. The server sets `createdById` from the authenticated
 * session — the client never sends it. Returns 201 on success.
 */
export async function createTicket(
  input: CreateTicketInput,
): Promise<TicketResponse> {
  const { data } = await apiClient.post<TicketResponse>("/api/tickets", input);
  return data;
}
