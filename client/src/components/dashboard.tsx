import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchHello } from "@/api";

export function Dashboard() {
  const { user } = useAuth();

  // A small, real call to prove the wired stack works end to end — the health
  // probe is the most characteristic thing the server can say right now.
  const { data, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHello,
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3">
      <p className="text-2xl font-light tracking-tight">
        {user ? `Welcome, ${user.name ?? user.email}` : "Welcome"}
      </p>
      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Reaching the desk…"
          : data
            ? `Server says: ${data.message}`
            : "Your agent dashboard — ready for tickets."}
      </p>
    </main>
  );
}
