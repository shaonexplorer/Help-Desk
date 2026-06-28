import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
} from '@tanstack/react-table';
import {
  fetchTickets,
  type TicketWithUsers,
  type TicketPriority,
  type TicketCategory,
  type TicketStatus,
  type TicketSortField,
  type SortOrder,
} from '@/api';
import { Input } from '@/components/ui/input';
import {
  Search,
  TicketPlus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';

/**
 * Tickets blotter — the dispatcher's incident log (server-driven).
 *
 * All sorting, filtering, and pagination happen on the server. The client
 * translates user actions into query parameters, sends them to `GET /api/tickets`,
 * and renders the response. TanStack Table runs in **manual mode** — it handles
 * column definitions and rendering, but delegates all data processing to the
 * server. The signature monosequence prefix (TKT-0001) stays; the triage
 * filter pills stay; search is debounced to avoid firing on every keystroke.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function logTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Priority badge ─────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: 'border-[#C7C4BB] bg-white text-[#6B6860]',
  MEDIUM: 'border-[#E4E1D7] bg-white text-[#16150F]',
  HIGH: 'border-[#D4943A]/30 bg-[#FEF7EC] text-[#8B5E1A]',
  URGENT: 'border-[#B94A3A]/30 bg-[#FDF0EE] text-[#9B3627]',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Med',
  HIGH: 'High',
  URGENT: 'Crit',
};

const ALL_PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tracking-tight ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// ─── Category chip ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature',
  SUPPORT: 'Support',
  BILLING: 'Billing',
  OTHER: 'Other',
};

const ALL_CATEGORIES: TicketCategory[] = ['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'BILLING', 'OTHER'];

function CategoryChip({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex items-center rounded border border-[#E4E1D7] bg-[#F7F6F1] px-1.5 py-0.5 text-[11px] tracking-tight text-[#6B6860]">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

// ─── Status pill ────────────────────────────────────────────────────────────
//
// A color-coded case flag that matches the detail page's case flag exactly, so
// a Resolved ticket reads the same way in the blotter and the opened file. Each
// state gets its own dot + tinted pill: slate for Open (queued), amber for In
// Progress (active work), green for Resolved (settled), muted ink for Closed
// (archived). Same 11px utility scale as the priority badge and category chip —
// the three triage markers read as one cohesive row.

const STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: 'bg-[#6B6860]',
  IN_PROGRESS: 'bg-[#D4943A]',
  RESOLVED: 'bg-[#2F7D4F]',
  CLOSED: 'bg-[#1E3A5F]/40',
};

const STATUS_PILL: Record<TicketStatus, string> = {
  OPEN: 'border-[#C7C4BB] bg-[#F7F6F1] text-[#6B6860]',
  IN_PROGRESS: 'border-[#D4943A]/30 bg-[#FEF7EC] text-[#8B5E1A]',
  RESOLVED: 'border-[#2F7D4F]/30 bg-[#EEF7F1] text-[#2F7D4F]',
  CLOSED: 'border-[#E4E1D7] bg-[#F7F6F1] text-[#1E3A5F]/60',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function StatusPill({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-semibold tracking-tight ${STATUS_PILL[status]}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Sortable header ────────────────────────────────────────────────────────

function SortableHeader({
  column,
  children,
}: {
  column: Column<TicketWithUsers, unknown>;
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="group inline-flex items-center gap-1 text-[#6B6860] transition-colors hover:text-[#1E3A5F]"
    >
      {children}
      <ArrowUpDown
        className={`size-3 transition-opacity ${sorted ? 'opacity-100 text-[#1E3A5F]' : 'opacity-0 group-hover:opacity-50'}`}
      />
    </button>
  );
}

// ─── Filter pill ─────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium tracking-tight transition-colors ${
        active
          ? 'border-[#1E3A5F]/30 bg-[#E8EEF5] text-[#1E3A5F]'
          : 'border-[#E4E1D7] bg-white text-[#6B6860] hover:border-[#C7C4BB] hover:text-[#16150F]'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Sort column mapping (client ID → server field) ─────────────────────────

function toServerSort(columnId: string): TicketSortField {
  if (columnId === 'blotter' || columnId === 'log') return 'createdAt';
  if (columnId === 'subject') return 'subject';
  if (columnId === 'priority') return 'priority';
  return 'createdAt';
}

// ─── Column definitions ─────────────────────────────────────────────────────

const columnHelper = createColumnHelper<TicketWithUsers>();

const columns = [
  columnHelper.accessor('id', {
    id: 'blotter',
    header: 'Blotter',
    cell: (info) => (
      <span className="font-mono text-xs font-semibold tracking-tight text-[#1E3A5F]">
        {blotterId(info.getValue())}
      </span>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor('subject', {
    header: ({ column }) => <SortableHeader column={column}>Subject</SortableHeader>,
    cell: (info) => {
      const ticket = info.row.original;
      return (
        <Link
          to={`/tickets/${ticket.id}`}
          className="group block min-w-0 max-w-xs"
        >
          <p className="truncate text-sm font-medium tracking-tight text-[#16150F] underline-offset-2 group-hover:underline group-hover:text-[#1E3A5F] transition-colors">
            {info.getValue()}
          </p>
          <p className="truncate text-xs text-[#6B6860]">
            by {ticket.createdBy.name ?? ticket.createdBy.email}
          </p>
        </Link>
      );
    },
  }),
  columnHelper.accessor('priority', {
    header: ({ column }) => <SortableHeader column={column}>Priority</SortableHeader>,
    cell: (info) => <PriorityBadge priority={info.getValue()} />,
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => <CategoryChip category={info.getValue()} />,
    enableSorting: false,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusPill status={info.getValue()} />,
    enableSorting: false,
  }),
  columnHelper.accessor('assignedTo', {
    id: 'assignee',
    header: 'Assigned to',
    cell: (info) => {
      const assignee = info.getValue();
      if (!assignee) {
        return <span className="text-xs text-[#C7C4BB]">Unassigned</span>;
      }
      return (
        <span className="text-sm text-[#16150F]">
          {assignee.name ?? assignee.email}
        </span>
      );
    },
    enableSorting: false,
  }),
  columnHelper.accessor('createdAt', {
    id: 'log',
    header: 'Log',
    cell: (info) => (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono text-[11px] tracking-tight text-[#6B6860]">
          {logTimestamp(info.getValue())}
        </span>
        <span className="text-[11px] text-[#C7C4BB]">{relativeTime(info.getValue())}</span>
      </div>
    ),
    enableSorting: true,
  }),
];

// ─── Page component ─────────────────────────────────────────────────────────

const VALID_LIMITS = [10, 20, 50] as const;

export function TicketsListPage() {
  // ── Server-driven query state ──────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'log', desc: true },
  ]);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [searchInput, setSearchInput] = useState(''); // immediate input value
  const [searchQuery, setSearchQuery] = useState(''); // debounced value sent to server

  // Debounce search: 300ms after last keystroke.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1); // reset page when search changes
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput]);

  // Derive sort params from TanStack Table sorting state.
  const sortField: TicketSortField = sorting[0]
    ? toServerSort(sorting[0].id)
    : 'createdAt';
  const sortOrder: SortOrder = sorting[0]
    ? sorting[0].desc ? 'desc' : 'asc'
    : 'desc';

  // ── Build query params ─────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit,
    sort: sortField,
    order: sortOrder,
    ...(priorityFilter.length > 0 ? { priority: priorityFilter.join(',') } : {}),
    ...(categoryFilter.length > 0 ? { category: categoryFilter.join(',') } : {}),
    ...(assigneeFilter ? { assignee: assigneeFilter } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
  };

  // ── Fetch from server ──────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tickets', queryParams],
    queryFn: () => fetchTickets(queryParams),
  });

  const tickets = data?.tickets ?? [];
  const meta = data?.meta;

  // Derive unique assignees from the ticket data for the filter dropdown.
  // Since we only have the current page's data, we derive from all loaded pages.
  // For a more complete list, a dedicated endpoint could be added later.
  const assigneeOptions = (() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const t of tickets) {
      if (t.assignedTo && !map.has(t.assignedTo.id)) {
        map.set(t.assignedTo.id, {
          id: t.assignedTo.id,
          name: t.assignedTo.name ?? t.assignedTo.email,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const hasActiveFilters = priorityFilter.length > 0 || categoryFilter.length > 0 || assigneeFilter !== '' || searchQuery !== '';

  // ── TanStack Table (manual mode — server does the work) ────────────────────
  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: page - 1, // TanStack is 0-based, server is 1-based
        pageSize: limit,
      },
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1); // reset page when sort changes
    },
    pageCount: meta?.totalPages ?? 1,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Filter callbacks ───────────────────────────────────────────────────────
  const togglePriority = useCallback((p: TicketPriority) => {
    setPriorityFilter((prev) =>
      prev.includes(p) ? prev.filter((v) => v !== p) : [...prev, p],
    );
    setPage(1);
  }, []);

  const toggleCategory = useCallback((c: TicketCategory) => {
    setCategoryFilter((prev) =>
      prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c],
    );
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setPriorityFilter([]);
    setCategoryFilter([]);
    setAssigneeFilter('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  }, []);

  const selectClass =
    'h-7 rounded-md border border-[#E4E1D7] bg-white px-1.5 text-xs text-[#16150F] outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

  return (
    <main className="flex-1 bg-[#F7F6F1] text-[#16150F]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Eyebrow + counts */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#1E3A5F]">
            Ticket blotter
          </span>
          <span className="h-3 w-px bg-[#E4E1D7]" />
          {meta ? (
            <span className="font-mono text-xs text-[#6B6860]">
              {meta.total} {meta.total === 1 ? 'ticket' : 'tickets'}
            </span>
          ) : (
            <span className="font-mono text-xs text-[#6B6860]">Loading…</span>
          )}
        </div>

        <p className="mb-6 max-w-xl text-2xl font-light leading-snug tracking-tight text-[#16150F]">
          The incoming feed. Scan by priority, claim by name — every ticket is one
          action away from resolution.
        </p>

        {/* Search + primary action */}
        <div className="mb-4 flex items-center justify-between">
          <div className="relative max-w-sm sm:min-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6B6860]" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tickets, people…"
              className="h-9 border-[#E4E1D7] bg-white pl-8 placeholder:text-[#6B6860] focus-visible:ring-[#1E3A5F]/30"
            />
          </div>
          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E3A5F] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 focus-visible:ring-offset-2 rounded"
          >
            <TicketPlus className="size-3.5" />
            Open ticket
          </Link>
        </div>

        {/* Triage filters */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="size-3.5 text-[#C7C4BB]" />

          {/* Priority pills */}
          <div className="flex items-center gap-1">
            {ALL_PRIORITIES.map((p) => (
              <FilterPill
                key={p}
                label={PRIORITY_LABELS[p]}
                active={priorityFilter.includes(p)}
                onClick={() => togglePriority(p)}
              />
            ))}
          </div>

          <span className="h-4 w-px bg-[#E4E1D7]" />

          {/* Category pills */}
          <div className="flex items-center gap-1">
            {ALL_CATEGORIES.map((c) => (
              <FilterPill
                key={c}
                label={CATEGORY_LABELS[c]}
                active={categoryFilter.includes(c)}
                onClick={() => toggleCategory(c)}
              />
            ))}
          </div>

          <span className="h-4 w-px bg-[#E4E1D7]" />

          {/* Assignee dropdown */}
          <select
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All assignees</option>
            <option value="__unassigned__">Unassigned</option>
            {assigneeOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B6860] transition-colors hover:text-[#1E3A5F]"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="overflow-hidden rounded-xl border border-[#E4E1D7] bg-white">
            <div className="border-b border-[#E4E1D7] bg-[#F7F6F1]/50 px-5 py-3">
              <div className="flex items-center gap-6">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className="h-3 w-16 animate-pulse rounded bg-[#E4E1D7]" />
                ))}
              </div>
            </div>
            {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 border-b border-[#E4E1D7]/60 px-5 py-4 last:border-0">
                <span className="h-3 w-16 animate-pulse rounded bg-[#E4E1D7] font-mono" />
                <span className="h-3 w-40 animate-pulse rounded bg-[#E4E1D7]" />
                <span className="h-5 w-12 animate-pulse rounded-md bg-[#E4E1D7]" />
                <span className="h-5 w-14 animate-pulse rounded bg-[#E4E1D7]" />
                <span className="h-3 w-10 animate-pulse rounded bg-[#E4E1D7]" />
                <span className="h-3 w-20 animate-pulse rounded bg-[#E4E1D7]" />
                <span className="ml-auto h-3 w-20 animate-pulse rounded bg-[#E4E1D7]" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-[#E4E1D7] bg-white px-5 py-4 text-sm text-[#6B6860]">
            <span className="font-medium text-[#16150F]">Couldn't load tickets.</span>{' '}
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </div>
        )}

        {/* Empty — no tickets exist at all */}
        {!isLoading && !isError && meta?.total === 0 && !hasActiveFilters && (
          <div className="rounded-xl border border-dashed border-[#E4E1D7] bg-white/60 px-5 py-16 text-center">
            <p className="text-sm text-[#6B6860]">
              No tickets yet — open the first one to get started.
            </p>
          </div>
        )}

        {/* Filtered empty — has tickets but nothing matches */}
        {!isLoading && !isError && meta && meta.total > 0 && tickets.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#E4E1D7] bg-white/60 px-5 py-16 text-center">
            <p className="text-sm text-[#6B6860]">
              No tickets match your filters.{' '}
              <button
                type="button"
                onClick={clearAllFilters}
                className="font-medium text-[#1E3A5F] underline underline-offset-2"
              >
                Clear filters
              </button>
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && tickets.length > 0 && (
          <>
            <div className="overflow-hidden rounded-xl border border-[#E4E1D7] bg-white">
              {/* Header */}
              <div className="border-b border-[#E4E1D7] bg-[#F7F6F1]/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <div
                    key={headerGroup.id}
                    className="flex items-center gap-6 px-5 py-3"
                  >
                    {headerGroup.headers.map((header) => (
                      <div
                        key={header.id}
                        className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.08em] text-[#6B6860]"
                        style={{
                          width: header.id === 'blotter' ? '80px' :
                                 header.id === 'priority' ? '72px' :
                                 header.id === 'category' ? '80px' :
                                 header.id === 'status' ? '72px' :
                                 header.id === 'assignee' ? '120px' :
                                 header.id === 'log' ? '90px' :
                                 undefined,
                          ...(header.id === 'log' ? { marginLeft: 'auto' } : {}),
                          ...(header.id === 'subject' ? { flex: 1 } : {}),
                        }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-6 border-b border-[#E4E1D7]/60 px-5 py-4 last:border-0 transition-colors hover:bg-[#F7F6F1]/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      style={{
                        width: cell.column.id === 'blotter' ? '80px' :
                               cell.column.id === 'priority' ? '72px' :
                               cell.column.id === 'category' ? '80px' :
                               cell.column.id === 'status' ? '72px' :
                               cell.column.id === 'assignee' ? '120px' :
                               cell.column.id === 'log' ? '90px' :
                               undefined,
                        ...(cell.column.id === 'log' ? { marginLeft: 'auto' } : {}),
                        ...(cell.column.id === 'subject' ? { flex: 1 } : {}),
                      }}
                      className="whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#6B6860]">
                <span>Rows per page</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  className={selectClass}
                >
                  {VALID_LIMITS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 text-xs text-[#6B6860]">
                <span className="mr-2">
                  Page {page} of {meta?.totalPages ?? 1}
                </span>
                <button
                  type="button"
                  onClick={() => { setPage(1); }}
                  disabled={page <= 1}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="First page"
                >
                  <ChevronsLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                  disabled={page <= 1}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setPage((p) => p + 1); }}
                  disabled={page >= (meta?.totalPages ?? 1)}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setPage(meta?.totalPages ?? 1); }}
                  disabled={page >= (meta?.totalPages ?? 1)}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="Last page"
                >
                  <ChevronsRight className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
