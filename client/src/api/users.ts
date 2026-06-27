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

/** Payload for creating a new crew member. Role defaults to AGENT on the server. */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
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

/**
 * Create a new crew member. The server routes through Better Auth's sign-up
 * handler so the password is hashed and the Account row is linked exactly as
 * the email+password sign-in flow expects.
 */
export async function createUser(input: CreateUserInput): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>("/api/users", input);
  return data;
}

/** Payload for updating an existing crew member. All fields optional. */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

/**
 * Update an existing crew member. Only the provided fields are sent; the server
 * applies a partial update. Returns the updated roster-safe shape.
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/api/users/${id}`, input);
  return data;
}
