import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Ticket, Users, LogOut, ClipboardList } from 'lucide-react';

/**
 * The shared authenticated shell: a single navbar every interior page renders
 * inside of, with the brand, primary nav, and the viewer's sign-out control.
 * Interior pages (dashboard, crew, …) just render their own `<main>` content.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="size-3.5" />
          </span>
          <h1 className="text-lg font-medium tracking-tight">Help Desk</h1>
          <nav className="ml-4 flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent font-medium text-[#1E3A5F]'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/tickets"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent font-medium text-[#1E3A5F]'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <ClipboardList className="size-3.5" />
              Tickets
            </NavLink>
            <NavLink
              to="/users"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent font-medium text-[#1E3A5F]'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Users className="size-3.5" />
              Crew
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user?.name ?? user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
