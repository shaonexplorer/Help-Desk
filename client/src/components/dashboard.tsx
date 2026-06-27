import { useAuth } from "@/lib/auth";

export function Dashboard() {
  const { user } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <p className="text-2xl font-light tracking-tight">
        {user ? `Welcome, ${user.name ?? user.email}` : "Welcome"}
      </p>
      <p className="text-sm text-muted-foreground">
        Your agent dashboard is a blank canvas — ready for tickets.
      </p>
    </main>
  );
}
