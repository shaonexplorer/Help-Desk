import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    // useSession() clears the cookie and re-fetches automatically;
    // ProtectedRoute sees user become null and redirects to /login.
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-medium tracking-tight">Help Desk</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2">
        <p className="text-2xl font-light tracking-tight">
          {user ? `Welcome, ${user.name ?? user.email}` : "Welcome"}
        </p>
        <p className="text-sm text-muted-foreground">
          Your agent dashboard is a blank canvas — ready for tickets.
        </p>
      </main>
    </div>
  );
}
