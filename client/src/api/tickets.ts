import { apiClient } from '@/lib/api-client';

/** Ticket priority levels. Kept in sync with the Prisma TicketPriority enum. */
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Ticket category values. Kept in sync with the server-side allowlist. */
export type TicketCategory = 'BUG' | 'FEATURE_REQUEST' | 'SUPPORT' | 'BILLING' | 'OTHER';

/**
 * Ticket lifecycle states. Kept in sync with the Prisma TicketStatus enum and
 * the server-side TICKET_STATUSES allowlist. A ticket opens OPEN, moves to
 * IN_PROGRESS when picked up, RESOLVED when the fix is in, CLOSED when archived.
 */
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/** Sortable fields for the ticket list. Sent to the server as the `sort` param. */
export type TicketSortField = 'createdAt' | 'subject' | 'priority';

/** Sort direction. */
export type SortOrder = 'asc' | 'desc';

/** Minimal user shape included in ticket list responses. */
export interface TicketUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * A single ticket as returned by the list endpoint, with the creator and
 * assignee names resolved for display. Also includes sender info for inbound
 * email tickets.
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
  senderEmail: string | null;
  senderName: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
  messages?: TicketMessage[];
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
  senderEmail: string | null;
  senderName: string | null;
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
  priority?: string; // comma-separated, e.g. "HIGH,URGENT"
  category?: string; // comma-separated, e.g. "BUG,SUPPORT"
  assignee?: string; // single id or "__unassigned__"
  search?: string;
  status?: string; // comma-separated, e.g. "OPEN,IN_PROGRESS"
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
 * Payload for updating an existing ticket. All fields are optional — only the
 * provided ones are sent. `assignedToId: null` unassigns the ticket; omit the
 * key to leave it untouched. `priority` can also be updated.
 */
export interface UpdateTicketInput {
  assignedToId?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
}

/** Ticket message types. Kept in sync with the server-side TICKET_MESSAGE_TYPES. */
export type TicketMessageType = 'INBOUND_EMAIL' | 'AGENT_REPLY' | 'AUTOMATED_REPLY';

/** Payload for replying to a ticket. */
export interface TicketReplyInput {
  content: string;
  messageType: TicketMessageType;
  senderEmail?: string;
  senderName?: string;
}

/** Ticket message row. */
export interface TicketMessage {
  id: string;
  content: string;
  messageType: TicketMessageType;
  createdAt: string;
  senderEmail: string | null;
  senderName: string | null;
}

/** Response for ticket reply endpoint. */
export interface TicketReplyResponse {
  ticket: TicketWithUsers;
}

/** Response for ticket messages endpoint. */
export interface TicketMessagesResponse {
  messages: TicketMessage[];
}

/** Response for ticket polish endpoint. */
export interface TicketPolishResponse {
  polished: string;
}

/**
 * Fetch a paginated, sorted, filtered page of tickets. All query parameters
 * are optional — the server applies sensible defaults (page 1, limit 10,
 * sort by createdAt desc). Returns tickets with creator and assignee names
 * resolved plus pagination metadata.
 */
export async function fetchTickets(params?: TicketListParams): Promise<TicketsListResponse> {
  const { data } = await apiClient.get<TicketsListResponse>('/api/tickets', {
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
export async function createTicket(input: CreateTicketInput): Promise<TicketResponse> {
  const { data } = await apiClient.post<TicketResponse>('/api/tickets', input);
  return data;
}

/**
 * Update a ticket's assignee and/or status. Only the provided fields are sent;
 * the server leaves omitted fields untouched. On success the server returns the
 * full ticket with creator/assignee names resolved, so the caller can replace
 * the cached row directly instead of triggering a refetch.
 */
export async function updateTicket(
  id: string,
  input: UpdateTicketInput,
): Promise<TicketDetailResponse> {
  const { data } = await apiClient.patch<TicketDetailResponse>(`/api/tickets/${id}`, input);
  return data;
}

/**
 * Reply to a ticket by adding a message. On success the server returns the
 * updated ticket with creator/assignee names resolved.
 */
export async function replyToTicket(
  id: string,
  input: TicketReplyInput,
): Promise<TicketReplyResponse> {
  const { data } = await apiClient.post<TicketReplyResponse>(`/api/tickets/${id}/reply`, input);
  return data;
}

/**
 * Fetch all messages for a ticket.
 */
export async function fetchTicketMessages(id: string): Promise<TicketMessagesResponse> {
  const { data } = await apiClient.get<TicketMessagesResponse>(`/api/tickets/${id}/messages`);
  return data;
}

/**
 * Polish a reply using AI. Returns the polished text.
 */
export async function polishReply(id: string, content: string): Promise<TicketPolishResponse> {
  const { data } = await apiClient.post<TicketPolishResponse>(`/api/tickets/${id}/polish`, { content });
  return data;
}
