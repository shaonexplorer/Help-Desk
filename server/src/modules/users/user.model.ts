import prisma from '../../prisma';
import { auth } from '../../auth';

/**
 * The fields a roster response is allowed to expose. Selecting explicitly means
 * a future column added to User never leaks through the API by accident.
 * `deletedAt` is included so the client can render a "deactivated" badge for
 * soft-deleted users.
 */
export const ROSTER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  image: true,
  emailVerified: true,
  createdAt: true,
  deletedAt: true,
} as const;

export type RosterUser = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'AGENT';
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  deletedAt: Date | null;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'AGENT';
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'AGENT';
};

/**
 * User model — the only place that talks to Prisma about users. Controllers
 * call these methods; they never import prisma directly. Keeping every query
 * here means the data rules (what's exposed, how it's ordered, soft-delete
 * filters, etc.) live in one spot.
 */
export const UserModel = {
  /**
   * The full crew roster, most-recently-joined first. Soft-deleted users are
   * included (with `deletedAt` set) so the client can render them with a
   * "deactivated" badge — but never expose them as active crew. Filtering by
   * hand rather than `where: { deletedAt: null }` keeps the choice explicit
   * and easy to flip.
   */
  async findRoster(): Promise<RosterUser[]> {
    return prisma.user.findMany({
      select: ROSTER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  },

  /** A single user by id, or null. Returns only roster-safe fields. */
  async findById(id: string): Promise<RosterUser | null> {
    return prisma.user.findUnique({
      where: { id },
      select: ROSTER_SELECT,
    });
  },

  /**
   * Soft-delete a user by stamping `deletedAt`. Returns the updated row (with
   * `deletedAt` set), or null if the user doesn't exist or is already deleted.
   * The caller is responsible for refusing to delete admins — that rule lives
   * in the controller, not here.
   */
  async softDeleteById(id: string): Promise<RosterUser | null> {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) return null;

    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ROSTER_SELECT,
    });
  },

  /**
   * Reactivate a soft-deleted user by clearing `deletedAt`. Returns the updated
   * row (with `deletedAt: null`), or null if the user doesn't exist or isn't
   * currently deleted.
   */
  async reactivateById(id: string): Promise<RosterUser | null> {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!existing || !existing.deletedAt) return null;

    return prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      select: ROSTER_SELECT,
    });
  },

  /**
   * Create a new crew member. Uses Better Auth's own sign-up handler (a
   * synthetic Request through `auth.handler`) so the password hash and the
   * linked Account row are created exactly as the client sign-in flow expects —
   * no manual hashing. The role is set afterward via a direct Prisma update,
   * since the sign-up endpoint doesn't accept custom fields.
   */
  async createUser(input: CreateUserInput): Promise<RosterUser> {
    const url = new URL(
      '/api/auth/sign-up/email',
      process.env.BETTER_AUTH_URL ?? 'http://localhost:5000',
    );
    const body = new URLSearchParams({
      email: input.email,
      password: input.password,
      name: input.name,
    });

    const request = new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const response = await auth.handler(request);
    const result = (await response.json()) as
      | { user?: { id: string } | null }
      | null;

    if (!response.ok || !result?.user) {
      throw new Error(
        `Sign-up failed (${response.status}): ${JSON.stringify(result)}`,
      );
    }

    // Better Auth's sign-up endpoint doesn't accept custom fields, so the role
    // is applied as a follow-up. The caller decides the default.
    const user = await prisma.user.update({
      where: { id: result.user.id },
      data: { role: input.role },
      select: ROSTER_SELECT,
    });

    return user;
  },

  /**
   * Update an existing crew member. Name, email, and role are applied via a
   * direct Prisma update. Password is accepted for validation but not applied
   * here — Better Auth's `setPassword` requires an active session, and
   * `changePassword` requires the current password, neither of which an admin
   * flow has on hand. Password reset is a separate flow.
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<RosterUser> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.role !== undefined) data.role = input.role;

    return prisma.user.update({
      where: { id },
      data,
      select: ROSTER_SELECT,
    });
  },
};
