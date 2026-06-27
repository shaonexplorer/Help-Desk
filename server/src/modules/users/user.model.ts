import prisma from '../../prisma';
import { auth } from '../../auth';

/**
 * The fields a roster response is allowed to expose. Selecting explicitly means
 * a future column added to User never leaks through the API by accident.
 */
export const ROSTER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  image: true,
  emailVerified: true,
  createdAt: true,
} as const;

export type RosterUser = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'AGENT';
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'AGENT';
};

/**
 * User model — the only place that talks to Prisma about users. Controllers
 * call these methods; they never import prisma directly. Keeping every query
 * here means the data rules (what's exposed, how it's ordered, soft-delete
 * filters, etc.) live in one spot.
 */
export const UserModel = {
  /** The full crew roster, most-recently-joined first. */
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
};
