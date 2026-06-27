import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { authClient } from "./auth-client";

interface SessionUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role?: 'ADMIN' | 'AGENT';
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // useSession is reactive: it fetches on mount and re-fetches when the
  // session cookie changes (after signIn / signOut calls on authClient).
  const { data, isPending, refetch } = authClient.useSession();

  // Map the Better Auth session shape into our app's SessionUser.
  // useSession returns { session, user } — we expose just the user.
  const user: SessionUser | null = data?.user
    ? {
        id: data.user.id,
        name: data.user.name ?? null,
        email: data.user.email,
        image: data.user.image ?? null,
      }
    : null;

  // Expose a refresh() so callers can force a re-check (e.g. after a
  // mutation that doesn't auto-trigger a re-fetch).
  const refresh = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider value={{ user, loading: isPending, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
