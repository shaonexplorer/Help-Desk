import type { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Ticket, Users, LogOut, ClipboardList, Menu, X } from 'lucide-react';

/**
 * The shared authenticated shell: a single navbar every interior page renders
 * inside of, with the brand, primary nav, and the viewer's sign-out control.
 * Interior pages (dashboard, crew, …) just render their own `<main>` content.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on any route change so a navigation never leaves a
  // stale open panel behind.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Escape-to-close.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Click-outside-to-close.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await authClient.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="size-3.5" />
          </span>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-lg font-medium tracking-tight text-[#16150F]">Help Desk</h1>
            <span className="font-mono text-xs tracking-tight text-[#6B6860]">
              abir@zeneheliac.resend.app
            </span>
          </div>
          <nav className="ml-4 hidden items-center gap-0.5 sm:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#2F7D4F]/10 font-medium text-[#2F7D4F]'
                    : 'text-[#6B6860] hover:text-[#16150F]'
                }`
              }
            >
              <span className="size-1.5 shrink-0 rounded-full bg-[#6B6860]" />
              Dashboard
            </NavLink>
            <NavLink
              to="/tickets"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#2F7D4F]/10 font-medium text-[#2F7D4F]'
                    : 'text-[#6B6860] hover:text-[#16150F]'
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
                    ? 'bg-[#2F7D4F]/10 font-medium text-[#2F7D4F]'
                    : 'text-[#6B6860] hover:text-[#16150F]'
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="hidden sm:inline-flex"
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>

          {/* Mobile toggle — visible only below sm */}
          <button
            type="button"
            className="inline-flex items-center justify-center sm:hidden"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="grid size-7 place-items-center rounded-lg border border-transparent text-[#16150F] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30">
              {menuOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
            </span>
          </button>
        </div>

        {/* Mobile dropdown — anchored under the header, visible only below sm */}
        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Navigation menu"
            className="absolute inset-x-0 top-full z-30 sm:hidden"
            style={{ animation: 'fade-in 0.15s ease-out both' }}
          >
            <div className="mx-4 mt-2 overflow-hidden rounded-lg border border-[#E4E1D7] bg-white py-1 shadow-lg shadow-[#16150F]/5">
              {/* Viewer label at the top */}
              <div className="border-b border-[#E4E1D7] px-3 py-2 text-sm font-medium text-[#16150F]">
                {user?.name ?? user?.email}
              </div>

              <NavLink
                to="/"
                end
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[#F7F6F1] focus-visible:bg-[#F7F6F1] focus-visible:outline-none ${
                    isActive ? 'bg-[#2F7D4F]/10 font-medium text-[#2F7D4F]' : 'text-[#6B6860]'
                  }`
                }
              >
                <span className="size-1.5 shrink-0 rounded-full bg-[#6B6860]" />
                Dashboard
              </NavLink>
              <NavLink
                to="/tickets"
                end
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[#F7F6F1] focus-visible:bg-[#F7F6F1] focus-visible:outline-none ${
                    isActive ? 'bg-[#2F7D4F]/10 font-medium text-[#2F7D4F]' : 'text-[#6B6860]'
                  }`
                }
              >
                <ClipboardList className="size-3.5" />
                Tickets
              </NavLink>
              <NavLink
                to="/users"
                end
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[#F7F6F1] focus-visible:bg-[#F7F6F1] focus-visible:outline-none ${
                    isActive ? 'bg-[#2F7D4F]/10 font-medium text-[#2F7D4F]' : 'text-[#6B6860]'
                  }`
                }
              >
                <Users className="size-3.5" />
                Crew
              </NavLink>

              <div className="my-1 border-t border-[#E4E1D7]" role="separator" />

              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#6B6860] transition-colors hover:bg-[#F7F6F1] focus-visible:bg-[#F7F6F1] focus-visible:outline-none hover:text-[#1E3A5F]"
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
