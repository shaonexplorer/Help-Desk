import { ok, fail, isNonEmptyString } from '../../core/validate';
import type { ValidationResult } from '../../core/validate';

/**
 * Valid ticket categories. A plain array + typed union instead of a Prisma enum,
 * so adding a new category is a code change (no migration). Can be moved to a
 * database table later if product wants an admin UI for category management.
 */
export const TICKET_CATEGORIES = ['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'BILLING', 'OTHER'] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** The four priority levels. Kept in sync with the Prisma TicketPriority enum. */
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * The ticket lifecycle. Kept in sync with the Prisma TicketStatus enum. A ticket
 * opens OPEN, moves to IN_PROGRESS when someone picks it up, RESOLVED when the
 * fix is in, and CLOSED when the file is archived. Add a new state here and in
 * the Prisma enum together — never one without the other.
 */
export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * Valid message types for ticket messages.
 */
export const TICKET_MESSAGE_TYPES = ['INBOUND_EMAIL', 'AGENT_REPLY', 'AUTOMATED_REPLY'] as const;
export type TicketMessageType = (typeof TICKET_MESSAGE_TYPES)[number];

/**
 * Validate the body of a create-ticket request. Subject and description are
 * required; priority defaults to MEDIUM; category must be in the allowlist;
 * assignedToId is optional (controller does the DB lookup).
 */
export function validateCreateTicketBody(body: unknown): ValidationResult<{
  subject: string;
  description: string;
  priority: Priority;
  category: TicketCategory;
  assignedToId?: string;
}> {
  if (typeof body !== 'object' || body === null) {
    return fail(['Request body must be an object']);
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  // Subject
  if (!isNonEmptyString(record.subject)) {
    errors.push('"subject" is required');
  } else if (record.subject.length > 200) {
    errors.push('"subject" must be 200 characters or fewer');
  }

  // Description
  if (!isNonEmptyString(record.description)) {
    errors.push('"description" is required');
  } else if (record.description.length > 5000) {
    errors.push('"description" must be 5000 characters or fewer');
  }

  // Priority — defaults to MEDIUM if omitted.
  let priority: Priority = 'MEDIUM';
  if (record.priority !== undefined) {
    if (typeof record.priority !== 'string' || !PRIORITIES.includes(record.priority as Priority)) {
      errors.push(`"priority" must be one of ${PRIORITIES.join(', ')}`);
    } else {
      priority = record.priority as Priority;
    }
  }

  // Category — must be in the allowlist.
  let category: TicketCategory | undefined;
  if (!isNonEmptyString(record.category)) {
    errors.push('"category" is required');
  } else if (!TICKET_CATEGORIES.includes(record.category as TicketCategory)) {
    errors.push(`"category" must be one of ${TICKET_CATEGORIES.join(', ')}`);
  } else {
    category = record.category as TicketCategory;
  }

  // AssignedToId — optional non-empty string.
  let assignedToId: string | undefined;
  if (record.assignedToId !== undefined && record.assignedToId !== null) {
    if (!isNonEmptyString(record.assignedToId)) {
      errors.push('"assignedToId" must be a non-empty string');
    } else {
      assignedToId = record.assignedToId;
    }
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    subject: record.subject as string,
    description: record.description as string,
    priority,
    category: category!,
    assignedToId,
  });
}

// ─── List query validation ──────────────────────────────────────────────────

const VALID_SORT_FIELDS = ['createdAt', 'subject', 'priority'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_LIMITS = [10, 20, 50] as const;

export type TicketListQuery = {
  page: number;
  limit: number;
  sort: SortField;
  order: 'asc' | 'desc';
  priority?: Priority[];
  status?: TicketStatus[];
  category?: TicketCategory[];
  assignee?: string;
  search?: string;
};

/**
 * Validate and coerce the query params of a `GET /api/tickets` request.
 * All params are optional with sensible defaults — the validator fills in
 * defaults so the model always receives a complete `TicketListQuery`.
 */
export function validateTicketListQuery(
  query: Record<string, unknown>,
): ValidationResult<TicketListQuery> {
  const errors: string[] = [];

  // Page — default 1, must be ≥ 1
  let page = 1;
  if (query.page !== undefined) {
    const n = Number(query.page);
    if (!Number.isInteger(n) || n < 1) {
      errors.push('"page" must be a positive integer');
    } else {
      page = n;
    }
  }

  // Limit — default 10, must be 10/20/50
  let limit = 10;
  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || !VALID_LIMITS.includes(n as any)) {
      errors.push(`"limit" must be one of ${VALID_LIMITS.join(', ')}`);
    } else {
      limit = n;
    }
  }

  // Sort — default createdAt
  let sort: SortField = 'createdAt';
  if (query.sort !== undefined) {
    if (typeof query.sort !== 'string' || !VALID_SORT_FIELDS.includes(query.sort as SortField)) {
      errors.push(`"sort" must be one of ${VALID_SORT_FIELDS.join(', ')}`);
    } else {
      sort = query.sort as SortField;
    }
  }

  // Order — default desc
  let order: 'asc' | 'desc' = 'desc';
  if (query.order !== undefined) {
    if (query.order !== 'asc' && query.order !== 'desc') {
      errors.push('"order" must be "asc" or "desc"');
    } else {
      order = query.order;
    }
  }

  // Priority — comma-separated, each must be a valid priority
  let priority: Priority[] | undefined;
  if (
    query.priority !== undefined &&
    typeof query.priority === 'string' &&
    query.priority.length > 0
  ) {
    const parts = query.priority.split(',').map((s) => s.trim().toUpperCase());
    const invalid = parts.filter((p) => !PRIORITIES.includes(p as Priority));
    if (invalid.length > 0) {
      errors.push(`"priority" contains invalid values: ${invalid.join(', ')}`);
    } else {
      priority = parts as Priority[];
    }
  }

  // Category — comma-separated, each must be a valid category
  let category: TicketCategory[] | undefined;
  if (
    query.category !== undefined &&
    typeof query.category === 'string' &&
    query.category.length > 0
  ) {
    const parts = query.category.split(',').map((s) => s.trim().toUpperCase());
    const invalid = parts.filter((c) => !TICKET_CATEGORIES.includes(c as TicketCategory));
    if (invalid.length > 0) {
      errors.push(`"category" contains invalid values: ${invalid.join(', ')}`);
    } else {
      category = parts as TicketCategory[];
    }
  }

  // Status — comma-separated, each must be a valid status
  let status: TicketStatus[] | undefined;
  if (query.status !== undefined && typeof query.status === 'string' && query.status.length > 0) {
    const parts = query.status.split(',').map((s) => s.trim().toUpperCase());
    const invalid = parts.filter((s) => !TICKET_STATUSES.includes(s as TicketStatus));
    if (invalid.length > 0) {
      errors.push(`"status" contains invalid values: ${invalid.join(', ')}`);
    } else {
      status = parts as TicketStatus[];
    }
  }

  // Assignee — optional, single id or "__unassigned__"
  let assignee: string | undefined;
  if (
    query.assignee !== undefined &&
    typeof query.assignee === 'string' &&
    query.assignee.length > 0
  ) {
    assignee = query.assignee;
  }

  // Search — optional, trimmed, max 200 chars
  let search: string | undefined;
  if (query.search !== undefined && typeof query.search === 'string') {
    const trimmed = query.search.trim();
    if (trimmed.length > 200) {
      errors.push('"search" must be 200 characters or fewer');
    } else if (trimmed.length > 0) {
      search = trimmed;
    }
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    page,
    limit,
    sort,
    order,
    ...(priority ? { priority } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(assignee ? { assignee } : {}),
    ...(search ? { search } : {}),
  });
}

// ─── Update body validation ────────────────────────────────────────────────

/**
 * Validate the body of an update-ticket request. All fields are optional, but
 * at least one must be provided. `assignedToId` may be a non-empty string (a
 * user id), or explicitly `null` to pull the ticket back to the bench. When a
 * string is provided, the controller does the DB lookup to confirm the user is
 * live and active. `status` must be one of the allowed ticket states.
 * `priority` must be one of the allowed priority levels.
 */
export function validateUpdateTicketBody(body: unknown): ValidationResult<{
  assignedToId?: string | null;
  status?: TicketStatus;
  priority?: Priority;
}> {
  if (typeof body !== 'object' || body === null) {
    return fail(['Request body must be an object']);
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];
  let hasField = false;

  // AssignedToId — optional. A non-empty string assigns; null unassigns.
  // Anything else (empty string, number, object) is a client error.
  let assignedToId: string | null | undefined;
  if (record.assignedToId !== undefined) {
    if (record.assignedToId === null) {
      assignedToId = null;
      hasField = true;
    } else if (isNonEmptyString(record.assignedToId)) {
      assignedToId = record.assignedToId;
      hasField = true;
    } else {
      errors.push('"assignedToId" must be a non-empty string or null');
    }
  }

  // Status — optional, must be one of the allowlisted states.
  let status: TicketStatus | undefined;
  if (record.status !== undefined) {
    if (
      typeof record.status !== 'string' ||
      !TICKET_STATUSES.includes(record.status as TicketStatus)
    ) {
      errors.push(`"status" must be one of ${TICKET_STATUSES.join(', ')}`);
    } else {
      status = record.status as TicketStatus;
      hasField = true;
    }
  }

  // Priority — optional, must be one of the allowlisted priorities.
  let priority: Priority | undefined;
  if (record.priority !== undefined) {
    if (
      typeof record.priority !== 'string' ||
      !PRIORITIES.includes(record.priority as Priority)
    ) {
      errors.push(`"priority" must be one of ${PRIORITIES.join(', ')}`);
    } else {
      priority = record.priority as Priority;
      hasField = true;
    }
  }

  if (!hasField) {
    errors.push('At least one of assignedToId, status, or priority must be provided');
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    ...(assignedToId !== undefined ? { assignedToId } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(priority !== undefined ? { priority } : {}),
  });
}

// ─── Reply validation ──────────────────────────────────────────────────

export type CreateTicketMessageInput = {
  content: string;
  messageType: TicketMessageType;
  senderEmail?: string;
  senderName?: string;
};

/**
 * Validate the body of a reply-to-ticket request. Content is required;
 * messageType must be one of the allowed types; senderEmail/senderName are optional.
 */
export function validateCreateTicketMessageBody(
  body: unknown,
): ValidationResult<CreateTicketMessageInput> {
  if (typeof body !== 'object' || body === null) {
    return fail(['Request body must be an object']);
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  // Content - required
  if (!isNonEmptyString(record.content)) {
    errors.push('"content" is required');
  } else if (record.content.length > 10000) {
    errors.push('"content" must be 10000 characters or fewer');
  }

  // MessageType - required, must be valid
  if (!isNonEmptyString(record.messageType)) {
    errors.push('"messageType" is required');
  } else if (!TICKET_MESSAGE_TYPES.includes(record.messageType as TicketMessageType)) {
    errors.push(`"messageType" must be one of ${TICKET_MESSAGE_TYPES.join(', ')}`);
  }

  // SenderEmail - optional
  if (record.senderEmail !== undefined && !isNonEmptyString(record.senderEmail)) {
    errors.push('"senderEmail" must be a non-empty string if provided');
  }

  // SenderName - optional
  if (record.senderName !== undefined && !isNonEmptyString(record.senderName)) {
    errors.push('"senderName" must be a non-empty string if provided');
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    content: record.content as string,
    messageType: record.messageType as TicketMessageType,
    ...(record.senderEmail ? { senderEmail: record.senderEmail as string } : {}),
    ...(record.senderName ? { senderName: record.senderName as string } : {}),
  });
}

// ─── Polish validation ──────────────────────────────────────────────────────────

/**
 * Validate the body of a polish-reply request. Content is required.
 */
export function validatePolishReplyBody(body: unknown): ValidationResult<{ content: string }> {
  if (typeof body !== 'object' || body === null) {
    return fail(['Request body must be an object']);
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  // Content - required
  if (!isNonEmptyString(record.content)) {
    errors.push('"content" is required');
  } else if (record.content.length > 10000) {
    errors.push('"content" must be 10000 characters or fewer');
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  return ok({
    content: record.content as string,
  });
}
