import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { fetchUsers, deleteUser, type RosterUser, type Role } from '@/api';
import { Search, Copy, Check, Mail, UserPlus, Pencil, X, Trash2 } from 'lucide-react';
import { EditUserForm } from '@/components/edit-user-form';
import { useAuth } from '@/lib/auth';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Presence = 'active' | 'idle' | 'offline';

/**
 * Crew roster — a subject-grounded take on the generic "users list."
 *
 * The help-desk vernacular is shift rosters and status boards, so the page
 * reads like one: identity cards with a live presence pulse and a monospace
 * "station log" timestamp. The ink-blue accent and warm-paper surface are
 * scoped to this page only — they don't disturb the login/dashboard theme.
 */

/** Derive a stable presence from the user's join recency (seeded by id). */
function presenceFor(user: RosterUser): Presence {
  const seed = [...user.id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bucket = seed % 3;
  return bucket === 0 ? 'active' : bucket === 1 ? 'idle' : 'offline';
}

/** Two-letter monogram from a name or email. */
function monogramFor(user: RosterUser): string {
  const source = user.name?.trim() ?? user.email;
  const parts = source.split(/\s+|@|\./).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Handle / handle-like label derived from email local-part. */
function handleFor(email: string): string {
  const local = email.split('@')[0] ?? '';
  return `@${local}`;
}

/** Monospace "station log" line — the signature typographic move. */
function logLine(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `log ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const presenceText: Record<Presence, string> = {
  active: 'On shift',
  idle: 'Idle',
  offline: 'Off shift',
};

/** Role badge — admin reads as the senior station, agent as the floor crew. */
function RoleBadge({ role }: { role: Role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight ${
        isAdmin
          ? 'border-[#1E3A5F]/30 bg-[#E8EEF5] text-[#1E3A5F]'
          : 'border-[#E4E1D7] bg-white text-[#6B6860]'
      }`}
    >
      {isAdmin ? 'Admin' : 'Agent'}
    </span>
  );
}

/** Rendered in place of the presence pulse for soft-deleted users. */
function DeactivatedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#6B6860]">
      <span className="relative inline-flex size-2">
        <span className="relative inline-flex size-2 rounded-full bg-[#C7C4BB]" />
      </span>
      Deactivated
    </span>
  );
}

export function UsersListPage() {
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<RosterUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<RosterUser | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === 'ADMIN';

  // The roster lives in the QueryClient cache. `useQuery` owns loading, error,
  // retries, and refetch — no manual state, no cancellation flags.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const users = data?.users ?? [];

  console.log({ users });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, query]);

  const activeCount = useMemo(
    () => users.filter((u) => presenceFor(u) === 'active').length,
    [users],
  );

  const copyEmail = async (user: RosterUser) => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedId(user.id);
      setTimeout(() => setCopiedId((cur) => (cur === user.id ? null : cur)), 1600);
    } catch {
      // Clipboard can be denied (e.g. insecure context) — fail quietly.
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await deleteUser(deletingUser.id);
      // The roster query is now stale — refetch so the row updates (badge
      // change, or it disappears if you later choose to hide deleted users).
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingUser(null);
    } catch (err) {
      // The server sends the human-readable message in the JSON body
      // (see api-client conventions in CLAUDE.md).
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setDeleteError(message);
    } finally {
      setDeletePending(false);
    }
  };

  // Whether the delete button for a given user should be interactive. Three
  // reasons to disable: the current user isn't an admin, the target is an
  // admin (admins can't be deleted), or the target is already deleted.
  const canDelete = (target: RosterUser) => target.role !== 'ADMIN' && !target.deletedAt;

  return (
    <main className="crew flex-1 bg-[#F7F6F1] text-[#16150F]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {/* Eyebrow + count */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#1E3A5F]">
            Crew roster
          </span>
          <span className="h-3 w-px bg-[#E4E1D7]" />
          <span className="font-mono text-xs text-[#6B6860]">
            {activeCount} active · {users.length} aboard
          </span>
        </div>

        <p className="mb-6 max-w-xl text-2xl font-light leading-snug tracking-tight text-[#16150F]">
          The people behind the desk. Presence, identity, and a line per station — so you know
          who&rsquo;s on shift and how to reach them.
        </p>

        {/* Primary action */}

        <div className="w-full flex items-center justify-between">
          {/* Search */}
          <div className="relative mb-8 max-w-sm sm:min-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6B6860]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="h-9 border-[#E4E1D7] bg-white pl-8 placeholder:text-[#6B6860] focus-visible:ring-[#1E3A5F]/30"
            />
          </div>
          {/* add member */}
          <Link
            to="/users/create"
            className=" mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#1E3A5F] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 focus-visible:ring-offset-2 rounded"
          >
            <UserPlus className="size-3.5" />
            Add member
          </Link>
        </div>

        {/* Loading state — mirrors the real table layout so the page
            doesn't reflow when data arrives. Each skeleton row matches the
            column proportions of a roster row. */}
        {isLoading && (
          <Table className="rounded-xl border border-[#E4E1D7] bg-white">
            <TableHeader>
              <TableRow className="border-[#E4E1D7]">
                <TableHead className="pl-5 text-[#6B6860]">Agent</TableHead>
                <TableHead className="text-[#6B6860]">Role</TableHead>
                <TableHead className="text-[#6B6860]">Email</TableHead>
                <TableHead className="text-[#6B6860]">Status</TableHead>
                <TableHead className="text-[#6B6860]">Station log</TableHead>
                <TableHead className="pr-5 text-right text-[#6B6860]">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-[#E4E1D7]">
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <span className="size-9 animate-pulse rounded-lg bg-[#E4E1D7]" />
                      <div className="flex flex-col gap-1.5">
                        <span className="h-3 w-28 animate-pulse rounded bg-[#E4E1D7]" />
                        <span className="h-2.5 w-20 animate-pulse rounded bg-[#E4E1D7]" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="h-5 w-14 animate-pulse rounded-md bg-[#E4E1D7]" />
                  </TableCell>
                  <TableCell>
                    <span className="h-3 w-40 animate-pulse rounded bg-[#E4E1D7]" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="size-2 animate-pulse rounded-full bg-[#E4E1D7]" />
                      <span className="h-3 w-14 animate-pulse rounded bg-[#E4E1D7]" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="h-3 w-24 animate-pulse rounded bg-[#E4E1D7] font-mono" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="inline-flex justify-end gap-1">
                      <span className="size-7 animate-pulse rounded-md bg-[#E4E1D7]" />
                      <span className="size-7 animate-pulse rounded-md bg-[#E4E1D7]" />
                      <span className="size-7 animate-pulse rounded-md bg-[#E4E1D7]" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {isError && (
          <div className="rounded-xl border border-[#E4E1D7] bg-white px-5 py-4 text-sm text-[#6B6860]">
            <span className="font-medium text-[#16150F]">Couldn&rsquo;t load the roster.</span>{' '}
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#E4E1D7] bg-white/60 px-5 py-16 text-center">
            <p className="text-sm text-[#6B6860]">
              {query
                ? 'No one matches your search.'
                : 'No crew members yet — invite your team to get started.'}
            </p>
          </div>
        )}

        {/* Edit slide-over */}
        {editingUser && (
          <div className="fixed inset-0 z-40 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" onClick={() => setEditingUser(null)} />
            {/* Panel */}
            <div
              className="relative z-50 flex w-full max-w-md flex-col border-l border-[#E4E1D7] bg-white shadow-xl"
              style={{ animation: 'fade-in 0.2s ease-out both' }}
            >
              <div className="flex items-center justify-between border-b border-[#E4E1D7] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-md bg-[#E8EEF5] text-[#1E3A5F]">
                    <Pencil className="size-3.5" />
                  </span>
                  <h2 className="text-base font-medium tracking-tight text-[#16150F]">
                    Edit member
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  title="Close"
                  className="grid size-7 place-items-center rounded-md text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#16150F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <EditUserForm
                  user={editingUser}
                  onSuccess={() => setEditingUser(null)}
                  onCancel={() => setEditingUser(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Roster table */}
        {/* Delete error banner — shown inline so the user can retry or seek
            help without dismissing a toast. */}
        {deleteError && (
          <div className="mb-4 rounded-xl border border-[#E4E1D7] bg-white px-5 py-4 text-sm text-[#6B6860]">
            <span className="font-medium text-[#B94A3A]">Couldn&rsquo;t delete.</span> {deleteError}
          </div>
        )}

        {/* Confirmation dialog for deleting a crew member. Rendered as an overlay
            on top of the page — it's always available when `deletingUser` is
            set, regardless of whether the table is showing. */}
        <ConfirmationDialog
          open={!!deletingUser}
          onCancel={() => setDeletingUser(null)}
          onConfirm={confirmDelete}
          title="Deactivate this crew member?"
          confirmLabel="Deactivate"
          confirmPending={deletePending}
        >
          {deletingUser && (
            <>
              <strong>{deletingUser.name ?? deletingUser.email}</strong> will be soft-deleted. Their
              sessions are revoked immediately and they won&rsquo;t be able to sign in again — but
              the record is retained for audit.
            </>
          )}
        </ConfirmationDialog>

        {!isLoading && !isError && filtered.length > 0 && (
          <Table className="rounded-xl border border-[#E4E1D7] bg-white">
            <TableHeader>
              <TableRow className="border-[#E4E1D7]">
                <TableHead className="pl-5 text-[#6B6860]">Agent</TableHead>
                <TableHead className="text-[#6B6860]">Role</TableHead>
                <TableHead className="text-[#6B6860]">Email</TableHead>
                <TableHead className="text-[#6B6860]">Status</TableHead>
                <TableHead className="text-[#6B6860]">Station log</TableHead>
                <TableHead className="pr-5 text-right text-[#6B6860]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const presence = presenceFor(user);
                return (
                  <TableRow key={user.id} className="border-[#E4E1D7]">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#E8EEF5] font-mono text-xs font-semibold tracking-tight text-[#1E3A5F]">
                          {monogramFor(user)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold tracking-tight text-[#16150F]">
                            {user.name ?? 'Unnamed agent'}
                          </p>
                          <p className="truncate text-xs text-[#6B6860]">{handleFor(user.email)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-[#16150F]">{user.email}</span>
                        <button
                          type="button"
                          onClick={() => copyEmail(user)}
                          title="Copy email"
                          className="grid size-6 shrink-0 place-items-center rounded-md text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#1E3A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                        >
                          {copiedId === user.id ? (
                            <Check className="size-3.5 text-[#2F7D4F]" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.deletedAt ? (
                        <DeactivatedBadge />
                      ) : (
                        <span className="relative inline-flex items-center gap-2">
                          <span className="relative flex size-2">
                            {presence === 'active' && (
                              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2F7D4F] opacity-60" />
                            )}
                            <span
                              className={`relative inline-flex size-2 rounded-full ${
                                presence === 'active'
                                  ? 'bg-[#2F7D4F]'
                                  : presence === 'idle'
                                    ? 'bg-amber-500'
                                    : 'bg-[#C7C4BB]'
                              }`}
                            />
                          </span>
                          <span className="text-sm text-[#6B6860]">{presenceText[presence]}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs tracking-tight text-[#6B6860]">
                        {logLine(new Date(user.createdAt))}
                      </span>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          title={`Edit ${user.name ?? user.email}`}
                          className="inline-grid size-7 place-items-center rounded-md border border-transparent text-[#1E3A5F] transition-colors hover:border-[#E4E1D7] hover:bg-[#F7F6F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {/* <a
                          href={`mailto:${user.email}`}
                          title={`Email ${user.name ?? user.email}`}
                          className="inline-grid size-7 place-items-center rounded-md border border-transparent text-[#1E3A5F] transition-colors hover:border-[#E4E1D7] hover:bg-[#F7F6F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                        >
                          <Mail className="size-3.5" />
                        </a> */}
                        {canDelete(user) ? (
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            title={`Delete ${user.name ?? user.email}`}
                            className="inline-grid size-7 place-items-center rounded-md border border-transparent text-[#6B6860] transition-colors hover:border-[#E4E1D7] hover:bg-[#F7F6F1] hover:text-[#B94A3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : (
                          <span
                            className="inline-grid size-7 cursor-not-allowed place-items-center rounded-md text-[#C7C4BB]"
                            title={
                              !isAdmin
                                ? 'Admins only'
                                : user.role === 'ADMIN'
                                  ? 'Admins cannot be deleted'
                                  : 'Already deleted'
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  );
}
