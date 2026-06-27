import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { fetchUsers, type RosterUser, type Role } from "@/api";
import { Search, Copy, Check, Mail } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Presence = "active" | "idle" | "offline";

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
  return bucket === 0 ? "active" : bucket === 1 ? "idle" : "offline";
}

/** Two-letter monogram from a name or email. */
function monogramFor(user: RosterUser): string {
  const source = user.name?.trim() ?? user.email;
  const parts = source.split(/\s+|@|\./).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Handle / handle-like label derived from email local-part. */
function handleFor(email: string): string {
  const local = email.split("@")[0] ?? "";
  return `@${local}`;
}

/** Monospace "station log" line — the signature typographic move. */
function logLine(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `log ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

const presenceText: Record<Presence, string> = {
  active: "On shift",
  idle: "Idle",
  offline: "Off shift",
};

/** Role badge — admin reads as the senior station, agent as the floor crew. */
function RoleBadge({ role }: { role: Role }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight ${
        isAdmin
          ? "border-[#1E3A5F]/30 bg-[#E8EEF5] text-[#1E3A5F]"
          : "border-[#E4E1D7] bg-white text-[#6B6860]"
      }`}
    >
      {isAdmin ? "Admin" : "Agent"}
    </span>
  );
}

export function UsersListPage() {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // The roster lives in the QueryClient cache. `useQuery` owns loading, error,
  // retries, and refetch — no manual state, no cancellation flags.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const users = data?.users ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, query]);

  const activeCount = useMemo(
    () => users.filter((u) => presenceFor(u) === "active").length,
    [users]
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

        <p className="mb-8 max-w-xl text-2xl font-light leading-snug tracking-tight text-[#16150F]">
          The people behind the desk. Presence, identity, and a line per
          station — so you know who&rsquo;s on shift and how to reach them.
        </p>

        {/* Search */}
        <div className="relative mb-8 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6B6860]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="h-9 border-[#E4E1D7] bg-white pl-8 placeholder:text-[#6B6860] focus-visible:ring-[#1E3A5F]/30"
          />
        </div>

        {/* States */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-[#E4E1D7] bg-white"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-[#E4E1D7] bg-white px-5 py-4 text-sm text-[#6B6860]">
            <span className="font-medium text-[#16150F]">
              Couldn&rsquo;t load the roster.
            </span>{" "}
            {error instanceof Error ? error.message : "Something went wrong."}
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#E4E1D7] bg-white/60 px-5 py-16 text-center">
            <p className="text-sm text-[#6B6860]">
              {query
                ? "No one matches your search."
                : "No crew members yet — invite your team to get started."}
            </p>
          </div>
        )}

        {/* Roster table */}
        {!isLoading && !isError && filtered.length > 0 && (
          <Table className="rounded-xl border border-[#E4E1D7] bg-white">
            <TableHeader>
              <TableRow className="border-[#E4E1D7]">
                <TableHead className="pl-5 text-[#6B6860]">Agent</TableHead>
                <TableHead className="text-[#6B6860]">Role</TableHead>
                <TableHead className="text-[#6B6860]">Email</TableHead>
                <TableHead className="text-[#6B6860]">Status</TableHead>
                <TableHead className="text-[#6B6860]">Station log</TableHead>
                <TableHead className="pr-5 text-right text-[#6B6860]">
                  Contact
                </TableHead>
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
                            {user.name ?? "Unnamed agent"}
                          </p>
                          <p className="truncate text-xs text-[#6B6860]">
                            {handleFor(user.email)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-[#16150F]">
                          {user.email}
                        </span>
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
                      <span className="relative inline-flex items-center gap-2">
                        <span className="relative flex size-2">
                          {presence === "active" && (
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2F7D4F] opacity-60" />
                          )}
                          <span
                            className={`relative inline-flex size-2 rounded-full ${
                              presence === "active"
                                ? "bg-[#2F7D4F]"
                                : presence === "idle"
                                  ? "bg-amber-500"
                                  : "bg-[#C7C4BB]"
                            }`}
                          />
                        </span>
                        <span className="text-sm text-[#6B6860]">
                          {presenceText[presence]}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs tracking-tight text-[#6B6860]">
                        {logLine(new Date(user.createdAt))}
                      </span>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <a
                        href={`mailto:${user.email}`}
                        title={`Email ${user.name ?? user.email}`}
                        className="inline-grid size-7 place-items-center rounded-md border border-transparent text-[#1E3A5F] transition-colors hover:border-[#E4E1D7] hover:bg-[#F7F6F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
                      >
                        <Mail className="size-3.5" />
                      </a>
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

