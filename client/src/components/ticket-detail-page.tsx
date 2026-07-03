import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTicket,
  fetchUsers,
  updateTicket,
  replyToTicket,
  fetchTicketMessages,
  type TicketWithUsers,
  type TicketsListResponse,
  type TicketPriority,
  type TicketCategory,
  type TicketStatus,
  type TicketMessage,
} from '@/api';
import {
  ArrowLeft,
  User,
  Clock,
  Tag,
  AlertTriangle,
  UserPlus,
  X,
  Check,
  Mail,
  Send,
  Shield,
} from 'lucide-react';

/**
 * Ticket detail — the incident file pulled from a cabinet, now with a dispatch
 * rail and conversation thread.
 *
 * Where the blotter scans rows at a glance, this page reads like an opened
 * file: a call-number header, a case title, a reading area for the description,
 * a conversation thread, and a metadata rail with the filing details. The blotter
 * prefix is the hero — large monospace type that anchors the page immediately.
 *
 * The rail is no longer passive. Status is a segmented control (the four states
 * of a case's lifecycle) and the assignee is a delegate card with a button that
 * opens a crew slide-over — the same in-place mutation language the roster
 * uses for editing a member. Both mutations apply immediately; an inline error
 * in the rail surfaces a server refusal.
 */

// ─── Helpers (shared with blotter page, duplicated to keep this file self-contained) ──

function blotterId(id: string): string {
  const num = id.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `TKT-${num || '0001'}`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fullTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Two-letter monogram from a name or email. */
function monogramFor(user: { name: string | null; email: string }): string {
  const source = user.name?.trim() ?? user.email;
  const parts = source.split(/\s+|@|\./).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Handle-like label derived from an email local-part. */
function handleFor(email: string): string {
  const local = email.split('@')[0] ?? '';
  return `@${local}`;
}

/** Get display name for a message sender. */
function getMessageSenderName(message: TicketMessage): string {
  if (message.senderName) return message.senderName;
  if (message.senderEmail) return message.senderEmail;
  return 'Unknown';
}

// ─── Priority badge (full-width variant for the rail) ────────────────────────

const PRIORITY_STYLES: Record<TicketPriority, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-white', text: 'text-[#6B6860]', border: 'border-[#C7C4BB]' },
  MEDIUM: { bg: 'bg-white', text: 'text-[#16150F]', border: 'border-[#E4E1D7]' },
  HIGH: { bg: 'bg-[#FEF7EC]', text: 'text-[#8B5E1A]', border: 'border-[#D4943A]/30' },
  URGENT: { bg: 'bg-[#FDF0EE]', text: 'text-[#9B3627]', border: 'border-[#B94A3A]/30' },
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Critical',
};

// ─── Category label ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature request',
  SUPPORT: 'Support',
  BILLING: 'Billing',
  OTHER: 'Other',
};

// ─── Status ─────────────────────────────────────────────────────────────────
//
// Each case state gets its own color — a "case flag" that reads like the color
// tab on a physical file folder. Open is slate (queued, waiting), In progress is
// amber (active work, attention), Resolved is green (settled — matches the
// blotter's status dot), Closed is ink-muted (the file is archived). The colors
// are the signature of the rail: at a glance you know the case state without
// reading a word.

const STATUS_BAR: Record<TicketStatus, string> = {
  OPEN: 'bg-[#6B6860]',
  IN_PROGRESS: 'bg-[#D4943A]',
  RESOLVED: 'bg-[#2F7D4F]',
  CLOSED: 'bg-[#1E3A5F]',
};

const STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: 'bg-[#6B6860]',
  IN_PROGRESS: 'bg-[#D4943A]',
  RESOLVED: 'bg-[#2F7D4F]',
  CLOSED: 'bg-[#1E3A5F]/40',
};

const STATUS_BG: Record<TicketStatus, string> = {
  OPEN: 'bg-[#F7F6F1]',
  IN_PROGRESS: 'bg-[#FEF7EC]',
  RESOLVED: 'bg-[#EEF7F1]',
  CLOSED: 'bg-[#F7F6F1]',
};

const STATUS_TEXT: Record<TicketStatus, string> = {
  OPEN: 'text-[#6B6860]',
  IN_PROGRESS: 'text-[#8B5E1A]',
  RESOLVED: 'text-[#2F7D4F]',
  CLOSED: 'text-[#1E3A5F]/60',
};

const STATUS_BORDER: Record<TicketStatus, string> = {
  OPEN: 'border-[#C7C4BB]',
  IN_PROGRESS: 'border-[#D4943A]/30',
  RESOLVED: 'border-[#2F7D4F]/30',
  CLOSED: 'border-[#E4E1D7]',
};

/** Display label for each status, in lifecycle order. */
const STATUS_SEGMENTS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

// ─── Rail item (metadata sidebar entry) ──────────────────────────────────────

function RailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-[#C7C4BB]" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#C7C4BB]">{label}</p>
        <div className="mt-0.5 text-sm text-[#16150F]">{children}</div>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: TicketMessage }) {
  const isInbound = message.messageType === 'INBOUND_EMAIL';
  const isAgentReply = message.messageType === 'AGENT_REPLY';

  const containerClasses = `
    flex w-full max-w-3xl rounded-lg px-4 py-3
    ${isInbound ? 'bg-[#F0F4F8] ml-auto' : 'bg-white border border-[#E4E1D7]'}
  `;

  return (
    <div className={containerClasses}>
      <div className="flex items-start gap-2.5">
        {isInbound ? (
          <Mail className="size-5 shrink-0 text-[#1E3A5F] mt-0.5" />
        ) : isAgentReply ? (
          <Shield className="size-5 shrink-0 text-[#2F7D4F] mt-0.5" />
        ) : (
          <Send className="size-5 shrink-0 text-[#1E3A5F] mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#6B6860]">
              {getMessageSenderName(message)}
            </span>
            <span className="text-xs text-[#C7C4BB]">{relativeTime(message.createdAt)}</span>
          </div>
          <p className="text-sm text-[#16150F] whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page component ──────────────────────────────────────────────────────────

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Dispatch state: the crew slide-over, the status popover, the in-flight flag,
  // and the inline error. Both mutations share one error slot — they never fire
  // at the same time, and a single line is all the rail can hold without crowding.
  const [assigning, setAssigning] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isErrorMessages,
  } = useQuery({
    queryKey: ['ticket', id, 'messages'],
    queryFn: () => fetchTicketMessages(id!),
    enabled: !!id,
  });

  // Active crew for the assignment slide-over — same source as the create form.
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const ticket = data?.ticket;
  const messages = messagesData?.messages ?? [];
  const activeUsers = (usersData?.users ?? []).filter((u) => !u.deletedAt);

  // Apply a status change.
  const handleStatusChange = async (status: TicketStatus) => {
    if (!id || !ticket || ticket.status === status) return;
    setPending(true);
    setError(null);
    try {
      const { ticket: updated } = await updateTicket(id, { status });
      queryClient.setQueryData(['ticket', id], { ticket: updated });
      syncTicketIntoListCaches(queryClient, updated);
    } catch (err) {
      setError(readServerError(err));
    } finally {
      setPending(false);
    }
  };

  // Apply an assignment.
  const handleAssign = async (assignedToId: string | null) => {
    if (!id) return;
    setPending(true);
    setError(null);
    try {
      const { ticket: updated } = await updateTicket(id, { assignedToId });
      queryClient.setQueryData(['ticket', id], { ticket: updated });
      syncTicketIntoListCaches(queryClient, updated);
      setAssigning(false);
    } catch (err) {
      setError(readServerError(err));
    } finally {
      setPending(false);
    }
  };

  // Send a reply to the ticket
  const handleReply = async () => {
    if (!id || !replyContent.trim()) return;

    setIsSendingReply(true);
    setError(null);

    try {
      const { ticket: updated } = await replyToTicket(id, {
        content: replyContent.trim(),
        messageType: 'AGENT_REPLY',
      });

      // Invalidate messages query to fetch new message
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'messages'] });

      // Update ticket cache
      queryClient.setQueryData(['ticket', id], { ticket: updated });
      syncTicketIntoListCaches(queryClient, updated);

      // Clear reply input
      setReplyContent('');
    } catch (err) {
      setError(readServerError(err));
    } finally {
      setIsSendingReply(false);
    }
  };

  // Close the slide-over on Escape
  useEffect(() => {
    if (!assigning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssigning(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assigning]);

  // Close the status popover on Escape
  useEffect(() => {
    if (!openStatus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenStatus(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openStatus]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messages.length > 0) {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <main className="flex-1 bg-[#F7F6F1] text-[#16150F]">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        {/* Back link */}
        <Link
          to="/tickets"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6B6860] transition-colors hover:text-[#1E3A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 focus-visible:ring-offset-2 rounded"
        >
          <ArrowLeft className="size-3.5" />
          Back to blotter
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="animate-pulse space-y-6">
            <div className="space-y-2">
              <span className="inline-block h-5 w-28 rounded bg-[#E4E1D7] font-mono" />
              <span className="block h-7 w-3/4 rounded bg-[#E4E1D7]" />
            </div>
            <div className="flex gap-8">
              <div className="flex-1 space-y-3 rounded-xl border border-[#E4E1D7] bg-white p-6">
                <span className="block h-3 rounded bg-[#E4E1D7]" />
                <span className="block h-3 rounded bg-[#E4E1D7]" style={{ width: '60%' }} />
              </div>
              <div className="w-52 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <span className="block h-2.5 w-16 rounded bg-[#E4E1D7]" />
                    <span className="block h-4 w-24 rounded bg-[#E4E1D7]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-[#E4E1D7] bg-white px-5 py-4 text-sm text-[#6B6860]">
            <span className="font-medium text-[#16150F]">Couldn't load this ticket.</span>{' '}
            {queryError instanceof Error ? queryError.message : 'Something went wrong.'}
          </div>
        )}

        {/* Ticket content */}
        {ticket && (
          <div style={{ animation: 'fade-in 0.2s ease-out both' }}>
            {/* Call number header — the signature move */}
            <div className="mb-1">
              <span className="font-mono text-sm font-semibold tracking-tight text-[#1E3A5F]">
                {blotterId(ticket.id)}
              </span>
            </div>

            {/* Subject */}
            <h1 className="mb-6 max-w-2xl text-2xl font-light leading-snug tracking-tight text-[#16150F]">
              {ticket.subject}
            </h1>

            {/* Two-column: description + metadata rail - responsive on mobile */}
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              {/* Description card — the reading area */}
              <div className="flex-1 min-w-0">
                <div className="rounded-xl border border-[#E4E1D7] bg-white p-6 shadow-sm mb-6">
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-[#C7C4BB]">
                    Description
                  </h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#16150F]">
                    {ticket.description}
                  </div>
                </div>

                {/* Message History */}
                <div className="mb-6">
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-[#C7C4BB]">
                    Conversation
                  </h2>
                  <div className="messages-container h-64 lg:h-80 overflow-y-auto rounded-xl border border-[#E4E1D7] bg-white p-4">
                    {isLoadingMessages && (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 rounded bg-[#E4E1D7]" />
                        <div className="h-4 rounded bg-[#E4E1D7]" style={{ width: '60%' }} />
                      </div>
                    )}
                    {isErrorMessages && (
                      <p className="text-sm text-[#6B6860]">Failed to load messages.</p>
                    )}
                    {messages.length === 0 && !isLoadingMessages && (
                      <p className="text-sm text-[#C7C4BB]">No messages yet.</p>
                    )}
                    {messages.map((message: TicketMessage) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                  </div>
                </div>

                {/* Reply Form */}
                <div className="rounded-xl border border-[#E4E1D7] bg-white p-4">
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-[#C7C4BB]">
                    Reply
                  </h2>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full rounded-md border border-[#E4E1D7] bg-white px-3 py-2 text-sm text-[#16150F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-transparent resize-y"
                    rows={4}
                    disabled={isSendingReply}
                  />
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={isSendingReply || !replyContent.trim()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2E3A6F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 disabled:opacity-50 w-full justify-center"
                  >
                    <Send className="size-3.5" />
                    {isSendingReply ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>

              {/* Metadata rail — the filing details, now with dispatch controls */}
              <div className="w-full lg:w-52 shrink-0 space-y-5">
                {/* Status — case flag */}
                <div>
                  <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[#C7C4BB]">
                    Status
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenStatus((v) => !v)}
                    disabled={pending}
                    aria-haspopup="listbox"
                    aria-expanded={openStatus}
                    className={`relative flex w-full items-center gap-2.5 rounded-lg border pl-2.5 pr-3 py-2 text-left transition-colors disabled:opacity-50 ${STATUS_BORDER[ticket.status]} ${STATUS_BG[ticket.status]} hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30`}
                  >
                    {/* Color bar — the signature tab */}
                    <span
                      className={`h-5 w-1 shrink-0 rounded-full ${STATUS_BAR[ticket.status]}`}
                    />
                    <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[ticket.status]}`} />
                    <span className={`flex-1 text-sm font-medium ${STATUS_TEXT[ticket.status]}`}>
                      {STATUS_SEGMENTS.find((s) => s.value === ticket.status)?.label}
                    </span>
                    <svg
                      className={`size-3.5 shrink-0 text-[#C7C4BB] transition-transform ${openStatus ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Dispatch menu */}
                  {openStatus && (
                    <div className="relative mt-1" role="listbox" aria-label="Change ticket status">
                      <div className="absolute left-0 right-0 z-30 overflow-hidden rounded-lg border border-[#E4E1D7] bg-white py-1 shadow-lg shadow-[#16150F]/5">
                        {STATUS_SEGMENTS.map((seg) => {
                          const isActive = ticket.status === seg.value;
                          return (
                            <button
                              key={seg.value}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              onClick={() => {
                                setOpenStatus(false);
                                handleStatusChange(seg.value);
                              }}
                              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F7F6F1] focus-visible:bg-[#F7F6F1] focus-visible:outline-none ${
                                isActive ? 'bg-[#F7F6F1]' : ''
                              }`}
                            >
                              <span
                                className={`size-2 shrink-0 rounded-full ${STATUS_DOT[seg.value]}`}
                              />
                              <span
                                className={`flex-1 text-sm ${isActive ? 'font-medium text-[#16150F]' : 'text-[#6B6860]'}`}
                              >
                                {seg.label}
                              </span>
                              {isActive && <Check className="size-3.5 text-[#1E3A5F]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <RailItem icon={AlertTriangle} label="Priority">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-tight ${PRIORITY_STYLES[ticket.priority].bg} ${PRIORITY_STYLES[ticket.priority].text} ${PRIORITY_STYLES[ticket.priority].border}`}
                  >
                    {PRIORITY_LABELS[ticket.priority]}
                  </span>
                </RailItem>

                {/* Category */}
                <RailItem icon={Tag} label="Category">
                  <span className="inline-flex items-center rounded border border-[#E4E1D7] bg-[#F7F6F1] px-2 py-0.5 text-xs tracking-tight text-[#6B6860]">
                    {CATEGORY_LABELS[ticket.category as TicketCategory]}
                  </span>
                </RailItem>

                {/* Assigned to — delegate card */}
                <div className="">
                  <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[#C7C4BB]">
                    Assigned to
                  </p>
                  {ticket.assignedTo ? (
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#E8EEF5] text-[11px] font-semibold tracking-tight text-[#1E3A5F]">
                        {monogramFor(ticket.assignedTo)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-[#16150F]">
                        {ticket.assignedTo.name ?? ticket.assignedTo.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#C7C4BB] mr-1.5">Unassigned</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAssigning(true)}
                    disabled={pending}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#E4E1D7] bg-white px-2.5 py-1 text-xs font-medium text-[#1E3A5F] transition-colors hover:bg-[#E8EEF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <UserPlus className="size-3" />
                    {ticket.assignedTo ? 'Reassign' : 'Assign'}
                  </button>
                </div>

                {/* Sender (for inbound emails) or Opened by (fallback) */}
                {ticket.senderEmail || ticket.senderName ? (
                  <RailItem icon={Mail} label="Sender">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-[#16150F]">
                        {ticket.senderName ?? ticket.senderEmail}
                      </span>
                      {ticket.senderEmail && ticket.senderName && (
                        <span className="text-xs text-[#6B6860]">{ticket.senderEmail}</span>
                      )}
                    </div>
                  </RailItem>
                ) : (
                  <RailItem icon={User} label="Opened by">
                    {ticket.createdBy.name ?? ticket.createdBy.email}
                  </RailItem>
                )}

                {/* Timestamps */}
                <RailItem icon={Clock} label="Opened">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs tracking-tight text-[#6B6860]">
                      {fullTimestamp(ticket.createdAt)}
                    </span>
                    <span className="text-[11px] text-[#C7C4BB]">
                      {relativeTime(ticket.createdAt)}
                    </span>
                  </div>
                </RailItem>

                {/* Inline mutation error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#B94A3A]/30 bg-[#FDF0EE] px-3 py-2 text-xs text-[#9B3627]"
                  >
                    <span className="font-medium">Couldn't update.</span> {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assignment slide-over */}
        {assigning && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setAssigning(false)}
              aria-hidden="true"
            />
            <div
              className="relative z-50 flex w-full max-w-md flex-col border-l border-[#E4E1D7] bg-white shadow-xl"
              style={{ animation: 'fade-in 0.2s ease-out both' }}
            >
              <div className="flex items-center justify-between border-b border-[#E4E1D7] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-md bg-[#E8EEF5] text-[#1E3A5F]">
                    <UserPlus className="size-3.5" />
                  </span>
                  <h2 className="text-base font-medium tracking-tight text-[#16150F]">
                    Assign ticket
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigning(false)}
                  title="Close"
                  className="grid size-7 place-items-center rounded-md text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Unassign option */}
                <button
                  type="button"
                  onClick={() => handleAssign(null)}
                  className="flex w-full items-center gap-3 border-b border-[#E4E1D7] px-5 py-3 text-left transition-colors hover:bg-[#F7F6F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A5F]/30"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-dashed border-[#C7C4BB] text-[#C7C4BB]">
                    <X className="size-4" />
                  </span>
                  <span className="text-sm text-[#6B6860]">Unassign</span>
                </button>

                <ul className="divide-y divide-[#E4E1D7]">
                  {activeUsers.map((user) => {
                    const isCurrent = ticket?.assignedTo?.id === user.id;
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => handleAssign(user.id)}
                          disabled={pending}
                          className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#F7F6F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A5F]/30 disabled:opacity-50"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#E8EEF5] text-[11px] font-semibold tracking-tight text-[#1E3A5F]">
                            {monogramFor(user)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-[#16150F]">
                                {user.name ?? user.email}
                              </span>
                              {isCurrent && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E8EEF5] px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-[#1E3A5F]">
                                  <Check className="size-2.5" />
                                  On this case
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-xs text-[#6B6860]">
                              {handleFor(user.email)} · {user.role === 'ADMIN' ? 'Admin' : 'Agent'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {activeUsers.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-[#6B6860]">
                    No active crew to assign.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/**
 * Patch an updated ticket into every cached list page.
 */
function syncTicketIntoListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: TicketWithUsers,
) {
  const listQueries = queryClient.getQueriesData<TicketsListResponse>({
    queryKey: ['tickets'],
  });
  for (const [key, data] of listQueries) {
    if (!data) continue;
    const idx = data.tickets.findIndex((t) => t.id === updated.id);
    if (idx === -1) continue;
    const next = [...data.tickets];
    next[idx] = updated;
    queryClient.setQueryData(key, { ...data, tickets: next });
  }
}

/**
 * Read a server's message from a caught error.
 */
function readServerError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data &&
    typeof err.response.data === 'object' &&
    'error' in err.response.data &&
    typeof (err.response.data as Record<string, unknown>).error === 'string'
  ) {
    return (err.response.data as Record<string, string>).error;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
