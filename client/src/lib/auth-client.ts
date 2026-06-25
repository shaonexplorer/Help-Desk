import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client singleton.
 *
 * - baseURL falls back to "" (same-origin) in dev, where the Vite proxy
 *   forwards /api → server. Set VITE_AUTH_BASE_URL in production.
 * - credentials: "include" ensures the session cookie is sent on
 *   cross-origin requests (dev proxy + prod).
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL,
  fetchOptions: { credentials: "include" },
});
