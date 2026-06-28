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

/** Sortable fields for the ticket list. Sent to the server as the `sort` param. */
export type TicketSortField = "createdAt" | "subject" | "priority";

/** Sort direction. */
export type SortOrder = "asc" | "desc";

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

/** Pagination metadata returned by the ticket list endpoint. */
export interface TicketsListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Query parameters for the server-driven ticket list endpoint. */
export interface TicketListParams {
  page?: number;
  limit?: number;
  sort?: TicketSortField;
  order?: SortOrder;
  priority?: string;     // comma-separated, e.g. "HIGH,URGENT"
  category?: string;     // comma-separated, e.g. "BUG,SUPPORT"
  assignee?: string;     // single id or "__unassigned__"
  search?: string;
}

/** Response from the server-driven ticket list endpoint. */
export interface TicketsListResponse {
  tickets: TicketWithUsers[];
  meta: TicketsListMeta;
}

export interface TicketDetailResponse {
  ticket: TicketWithUsers;
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
 * Fetch a paginated, sorted, filtered page of tickets. All query parameters
 * are optional — the server applies sensible defaults (page 1, limit 10,
 * sort by createdAt desc). Returns tickets with creator and assignee names
 * resolved plus pagination metadata.
 */
export async function fetchTickets(
  params?: TicketListParams,
): Promise<TicketsListResponse> {
  const { data } = await apiClient.get<TicketsListResponse>("/api/tickets", {
    params,
  });
  return data;
}

/**
 * Fetch a single ticket by id, with the creator and assignee names resolved.
 * Returns 404 if the ticket doesn't exist.
 */
export async function fetchTicket(id: string): Promise<TicketDetailResponse> {
  const { data } = await apiClient.get<TicketDetailResponse>(`/api/tickets/${id}`);
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
