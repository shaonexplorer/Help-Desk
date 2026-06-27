import { apiClient } from "@/lib/api-client";

/** The two roles a crew member can hold. Kept in sync with the Prisma Role enum. */
export type Role = "ADMIN" | "AGENT";

/**
 * A single member of the crew roster, as returned by the server. Mirrors the
 * User model fields the server chooses to expose — never the full row.
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

export interface UserResponse {
  user: RosterUser;
}

/**
 * Fetch the full crew roster. Requires an authenticated session (the server
 * gates /api/* behind Better Auth). Returns members most-recently-joined first.
 */
export async function fetchUsers(): Promise<UsersResponse> {
  const { data } = await apiClient.get<UsersResponse>("/api/users");
  return data;
}

/** Fetch a single crew member by id. Returns the roster-safe shape. */
export async function fetchUser(id: string): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>(`/api/users/${id}`);
  return data;
}
