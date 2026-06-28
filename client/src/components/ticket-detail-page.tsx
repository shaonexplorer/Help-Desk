import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTicket,
  fetchUsers,
  updateTicket,
  type TicketWithUsers,
  type TicketsListResponse,
  type TicketPriority,
  type TicketCategory,
  type TicketStatus,
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
} from 'lucide-react';

/**
 * Ticket detail — the incident file pulled from a cabinet, now with a dispatch
 * rail.
 *
 * Where the blotter scans rows at a glance, this page reads like an opened
 * file: a call-number header, a case title, a reading area for the description,
 * and a metadata rail with the filing details. The blotter prefix is the hero —
 * large monospace type that anchors the page immediately.
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

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  // Active crew for the assignment slide-over — same source as the create form.
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const ticket = data?.ticket;
  const activeUsers = (usersData?.users ?? []).filter((u) => !u.deletedAt);

  // Apply a status change. The new status is sent alone; the assignee is left
  // untouched by omitting the key. The server returns the full ticket with
  // relations resolved, so we patch the cache directly instead of waiting on a
  // background refetch — the segmented control moves on the next frame, before
  // the network round-trip resolves. We also patch the same ticket into every
  // cached list page (`['tickets', queryParams]`) so the blotter reflects the
  // new state without a refetch; any list row that isn't cached simply stays as
  //-is until its page next loads.
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

  // Apply an assignment. `null` unassigns; a string id reassigns. The slide-over
  // closes on success so the new delegate card is visible immediately. As with
  // status, we patch the cache from the mutation response rather than invalidating.
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

  // Close the slide-over on Escape — matches the ConfirmationDialog convention
  // so keyboard users have a consistent way to back out of any overlay.
  useEffect(() => {
    if (!assigning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssigning(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assigning]);

  // Close the status popover on Escape, matching the slide-over convention.
  useEffect(() => {
    if (!openStatus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenStatus(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openStatus]);

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
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="block h-3 rounded bg-[#E4E1D7]" style={{ width: `${70 + Math.random() * 30}%` }} />
                ))}
              </div>
              <div className="w-48 space-y-4">
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

            {/* Two-column: description + metadata rail */}
            <div className="flex gap-8">
              {/* Description card — the reading area */}
              <div className="flex-1 min-w-0">
                <div className="rounded-xl border border-[#E4E1D7] bg-white p-6 shadow-sm">
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-[#C7C4BB]">
                    Description
                  </h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#16150F]">
                    {ticket.description}
                  </div>
                </div>
              </div>

              {/* Metadata rail — the filing details, now with dispatch controls */}
              <div className="w-52 shrink-0 space-y-5">
                {/* Status — case flag. A color-tabbed marker (like the tab on a
                    physical file folder) that shows the case state at a glance.
                    Clicking it opens the dispatch menu to move the case. */}
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
                    <span className={`h-5 w-1 shrink-0 rounded-full ${STATUS_BAR[ticket.status]}`} />
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

                  {/* Dispatch menu — a vertical progression of states. The current
                      state is checked; hovering previews the destination. */}
                  {openStatus && (
                    <div
                      className="relative mt-1"
                      role="listbox"
                      aria-label="Change ticket status"
                    >
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
                              <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[seg.value]}`} />
                              <span className={`flex-1 text-sm ${isActive ? 'font-medium text-[#16150F]' : 'text-[#6B6860]'}`}>
                                {seg.label}
                              </span>
                              {isActive && (
                                <Check className="size-3.5 text-[#1E3A5F]" />
                              )}
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
                <div>
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
                    <span className="text-sm text-[#C7C4BB]">Unassigned</span>
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

                {/* Opened by */}
                <RailItem icon={User} label="Opened by">
                  {ticket.createdBy.name ?? ticket.createdBy.email}
                </RailItem>

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

                {/* Inline mutation error — shown in the rail so the user can retry
                    without dismissing a toast. */}
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

        {/* Assignment slide-over — mirrors the roster edit panel. A crew identity
            card per row; the current assignee carries an "On this case" marker
            so the handoff is visible before it's made. */}
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
                  className="grid size-7 place-items-center rounded-md text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#16150F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Unassign option — sits at the top so pulling a ticket back to
                    the bench is a single tap. */}
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

// ─── Shared error reader ────────────────────────────────────────────────────

/**
 * Patch an updated ticket into every cached list page. The blotter is keyed on
 * `['tickets', queryParams]` and holds `{ tickets, meta }`; any page that already
 * contains this ticket gets its row replaced so the new status/assignee shows up
 * the instant you navigate back, without waiting on a refetch. Pages that don't
 * contain the ticket are left untouched — they'll be correct when they next load.
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
 * Read a server's message from a caught error. The server sends the human-readable
 * string at `response.data.error`; fall back to the error's own message, which is
 * the generic Axios "Request failed with status code NNN" line and never the intent.
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
