import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTicket, type TicketPriority, type TicketCategory } from '@/api';
import { ArrowLeft, User, Clock, Tag, AlertTriangle, CircleDot } from 'lucide-react';

/**
 * Ticket detail — the incident file pulled from the cabinet.
 *
 * Where the blotter scans rows at a glance, this page reads like an opened
 * file: a call-number header, a case title, a reading area for the description,
 * and a metadata rail with the filing details. The blotter prefix is the hero —
 * large monospace type that anchors the page immediately. Everything else is
 * quiet and supporting.
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const ticket = data?.ticket;

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
            {error instanceof Error ? error.message : 'Something went wrong.'}
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

              {/* Metadata rail — the filing details */}
              <div className="w-52 shrink-0 space-y-5">
                {/* Status */}
                <RailItem icon={CircleDot} label="Status">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#2F7D4F]" />
                    {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
                  </span>
                </RailItem>

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

                {/* Opened by */}
                <RailItem icon={User} label="Opened by">
                  {ticket.createdBy.name ?? ticket.createdBy.email}
                </RailItem>

                {/* Assigned to */}
                <RailItem icon={User} label="Assigned to">
                  {ticket.assignedTo
                    ? ticket.assignedTo.name ?? ticket.assignedTo.email
                    : <span className="text-[#C7C4BB]">Unassigned</span>}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
