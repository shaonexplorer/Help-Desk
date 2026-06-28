import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
} from '@tanstack/react-table';
import { fetchTickets, type TicketWithUsers, type TicketPriority, type TicketCategory } from '@/api';
import { Input } from '@/components/ui/input';
import {
  Search,
  TicketPlus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

/**
 * Tickets blotter — the dispatcher's incident log.
 *
 * Where the crew roster reads like a shift board, the tickets page reads like
 * a blotter: a running log of everything that's come in, sorted by recency,
 * scannable at a glance. The monosequence prefix (TKT-0001) is the signature
 * typographic move — it makes each row feel like a logbook entry, not a
 * spreadsheet cell. Sorting, filtering, and pagination are powered by TanStack
 * Table (headless) so the visual identity stays ours.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Derive a blotter prefix from the ticket id (stable, monosequence-style). */
function blotterId(id: string): string {
  // Extract a short numeric hash from the cuid for a logbook feel.
  const num = id.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `TKT-${num || '0001'}`;
}

/** Relative time label — "2h ago", "3d ago", "just now". */
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

/** Monospace "station log" timestamp. */
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

function CategoryChip({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex items-center rounded border border-[#E4E1D7] bg-[#F7F6F1] px-1.5 py-0.5 text-[11px] tracking-tight text-[#6B6860]">
      {CATEGORY_LABELS[category]}
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
    sortingFn: (a, b) =>
      new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
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
    sortDescFirst: true,
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => <CategoryChip category={info.getValue()} />,
    enableSorting: false,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <span className="inline-flex items-center gap-1.5 text-sm text-[#16150F]">
        <span className="size-1.5 rounded-full bg-[#2F7D4F]" />
        {info.getValue().charAt(0) + info.getValue().slice(1).toLowerCase()}
      </span>
    ),
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
  }),
];

// ─── Page component ─────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50] as const;

export function TicketsListPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'log', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  const tickets = data?.tickets ?? [];

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Search across subject, creator name/email, and assignee name/email.
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = filterValue.toLowerCase();
      const t = row.original;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.createdBy.name ?? '').toLowerCase().includes(q) ||
        t.createdBy.email.toLowerCase().includes(q) ||
        (t.assignedTo?.name ?? '').toLowerCase().includes(q) ||
        (t.assignedTo?.email ?? '').toLowerCase().includes(q)
      );
    },
  });

  const openCount = useMemo(() => tickets.filter((t) => t.status === 'OPEN').length, [tickets]);
  const urgentCount = useMemo(
    () => tickets.filter((t) => t.priority === 'URGENT').length,
    [tickets],
  );

  return (
    <main className="flex-1 bg-[#F7F6F1] text-[#16150F]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Eyebrow + counts */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#1E3A5F]">
            Ticket blotter
          </span>
          <span className="h-3 w-px bg-[#E4E1D7]" />
          <span className="font-mono text-xs text-[#6B6860]">
            {openCount} open · {tickets.length} total
          </span>
          {urgentCount > 0 && (
            <>
              <span className="h-3 w-px bg-[#E4E1D7]" />
              <span className="font-mono text-xs font-semibold text-[#9B3627]">
                {urgentCount} critical
              </span>
            </>
          )}
        </div>

        <p className="mb-6 max-w-xl text-2xl font-light leading-snug tracking-tight text-[#16150F]">
          The incoming feed. Scan by priority, claim by name — every ticket is one
          action away from resolution.
        </p>

        {/* Search + primary action */}
        <div className="mb-8 flex items-center justify-between">
          <div className="relative max-w-sm sm:min-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6B6860]" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
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
            {Array.from({ length: 8 }).map((_, i) => (
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

        {/* Empty */}
        {!isLoading && !isError && tickets.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#E4E1D7] bg-white/60 px-5 py-16 text-center">
            <p className="text-sm text-[#6B6860]">
              No tickets yet — open the first one to get started.
            </p>
          </div>
        )}

        {/* Filtered empty (had tickets but nothing matches search) */}
        {!isLoading && !isError && tickets.length > 0 && table.getRowModel().rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#E4E1D7] bg-white/60 px-5 py-16 text-center">
            <p className="text-sm text-[#6B6860]">
              No tickets match your search.
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && table.getRowModel().rows.length > 0 && (
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
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    table.setPageIndex(0);
                  }}
                  className="h-7 rounded-md border border-[#E4E1D7] bg-white px-1.5 text-xs text-[#16150F] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 text-xs text-[#6B6860]">
                <span className="mr-2">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <button
                  type="button"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="First page"
                >
                  <ChevronsLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="grid size-7 place-items-center rounded-md border border-[#E4E1D7] text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
                  title="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
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
