import prisma from '../../prisma';

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
};
