import { apiClient } from "./lib/api-client";

/**
 * API client utilities for the Help‑Desk front‑end.
 * All requests go through the shared axios instance (see lib/api-client.ts),
 * which carries the session cookie and targets the right origin in dev and prod.
 */
export interface HelloResponse {
  message: string;
}

/** The two roles a crew member can hold. Kept in sync with the Prisma enum. */
export type Role = "ADMIN" | "AGENT";

/**
 * A single member of the crew roster, as returned by the server.
 * Mirrors the User model fields we expose — never the full row.
 */
export interface RosterUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface UsersResponse {
  users: RosterUser[];
}

/**
 * Fetch the greeting from the Express back‑end.
 * Returns a promise that resolves to {@link HelloResponse}.
 */
export async function fetchHello(): Promise<HelloResponse> {
  const { data } = await apiClient.get<HelloResponse>("/api/hello");
  return data;
}

/**
 * Fetch the crew roster from the server. Requires an authenticated session
 * (the server gates /api/* behind Better Auth). Returns the list of team
 * members ordered by most-recently-joined first.
 */
export async function fetchUsers(): Promise<UsersResponse> {
  const { data } = await apiClient.get<UsersResponse>("/api/users");
  return data;
}
