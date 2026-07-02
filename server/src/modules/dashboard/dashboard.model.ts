import prisma from '../../prisma';
import { rangeToStartDate } from './dashboard.validation';
import { TICKET_CATEGORIES, TICKET_STATUSES, PRIORITIES } from '../tickets/ticket.validation';

/**
 * Dashboard model — the only place that talks to Prisma about dashboard stats.
 * Controllers call these methods; they never import prisma directly.
 */
export const DashboardModel = {
  /**
   * Get the time range start date for a given range.
   */
  getRangeStart(range?: '7d' | '30d' | '90d'): Date {
    return rangeToStartDate(range);
  },

  /**
   * Get the previous period's start date for delta calculations.
   * For a 30d range, this returns the start of the 30 days before that.
   */
  getPreviousRangeStart(range?: '7d' | '30d' | '90d'): Date {
    const currentStart = rangeToStartDate(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - days);
    return prevStart;
  },

  /**
   * Fetch key dashboard statistics (KPIs).
   */
  async getStats(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const prevStart = this.getPreviousRangeStart(range);

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      ticketsThisPeriod,
      ticketsPrevPeriod,
      avgResolutionTime,
      activeAgents,
    ] = await Promise.all([
      // Total tickets (all time)
      prisma.ticket.count(),

      // Current status counts
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),

      // Tickets created in current period
      prisma.ticket.count({
        where: { createdAt: { gte: start } },
      }),

      // Tickets created in previous period (for delta)
      prisma.ticket.count({
        where: { createdAt: { gte: prevStart, lt: start } },
      }),

      // Average resolution time (in hours) for resolved/closed tickets in period
      prisma.$queryRaw<{ avg_hours: number }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_hours
        FROM "Ticket"
        WHERE "status" IN ('RESOLVED', 'CLOSED')
        AND "updatedAt" >= ${start}
      `,

      // Active agents (users who have been assigned tickets in the period)
      prisma.user.count({
        where: {
          role: 'AGENT',
          deletedAt: null,
          assignedTickets: {
            some: {
              createdAt: { gte: start },
            },
          },
        },
      }),
    ]);

    const delta =
      ticketsPrevPeriod > 0
        ? ((ticketsThisPeriod - ticketsPrevPeriod) / ticketsPrevPeriod) * 100
        : ticketsThisPeriod > 0
          ? 100
          : 0;

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      ticketsThisPeriod,
      ticketsPrevPeriod,
      delta: Math.round(delta * 10) / 10,
      avgResolutionHours: avgResolutionTime[0]?.avg_hours
        ? Math.round(Number(avgResolutionTime[0].avg_hours) * 10) / 10
        : 0,
      activeAgents,
    };
  },

  /**
   * Get ticket counts grouped by status.
   */
  async getTicketsByStatus(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);

    const results = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: start },
      },
      _count: { status: true },
      orderBy: { _count: { status: 'desc' } },
    });

    // Ensure all statuses are represented
    const map = new Map(results.map((r) => [r.status, r._count.status]));
    return TICKET_STATUSES.map((status) => ({
      status,
      count: map.get(status) ?? 0,
    }));
  },

  /**
   * Get ticket counts grouped by priority.
   */
  async getTicketsByPriority(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);

    const results = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        createdAt: { gte: start },
      },
      _count: { priority: true },
      orderBy: { _count: { priority: 'desc' } },
    });

    const map = new Map(results.map((r) => [r.priority, r._count.priority]));
    return PRIORITIES.map((priority) => ({
      priority,
      count: map.get(priority) ?? 0,
    }));
  },

  /**
   * Get ticket counts grouped by category.
   */
  async getTicketsByCategory(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);

    const results = await prisma.ticket.groupBy({
      by: ['category'],
      where: {
        createdAt: { gte: start },
      },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    const map = new Map(results.map((r) => [r.category, r._count.category]));
    return TICKET_CATEGORIES.map((category) => ({
      category,
      count: map.get(category) ?? 0,
    }));
  },

  /**
   * Get ticket counts grouped by assignee (top 10).
   */
  async getTicketsByAssignee(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);

    const results = await prisma.ticket.groupBy({
      by: ['assignedToId'],
      where: {
        assignedToId: { not: null },
        createdAt: { gte: start },
      },
      _count: { assignedToId: true },
      orderBy: { _count: { assignedToId: 'desc' } },
      take: 10,
    });

    // Fetch assignee names
    const assigneeIds = results.map((r) => r.assignedToId!).filter(Boolean);
    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return results.map((r) => ({
      assigneeId: r.assignedToId!,
      assigneeName:
        userMap.get(r.assignedToId!)?.name ?? userMap.get(r.assignedToId!)?.email ?? 'Unknown',
      count: r._count.assignedToId,
    }));
  },

  /**
   * Get ticket trend over time (daily counts for the period).
   */
  async getTicketsOverTime(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const results = await prisma.$queryRaw<{ date: Date; count: bigint; status: string }[]>`
      SELECT DATE("createdAt") as date, "status", COUNT(*) as count
      FROM "Ticket"
      WHERE "createdAt" >= ${start}
      GROUP BY DATE("createdAt"), "status"
      ORDER BY DATE("createdAt") ASC
    `;

    // Build a complete date range
    const dateMap = new Map<
      string,
      { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 });
    }

    for (const r of results) {
      const key = r.date.toISOString().split('T')[0];
      const existing = dateMap.get(key);
      if (existing) {
        existing[r.status as keyof typeof existing] = Number(r.count);
      }
    }

    return Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
      total: counts.OPEN + counts.IN_PROGRESS + counts.RESOLVED + counts.CLOSED,
    }));
  },

  /**
   * Get resolution time trend (average hours per day).
   */
  async getResolutionTimeTrend(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const results = await prisma.$queryRaw<{ date: Date; avg_hours: number }[]>`
      SELECT DATE("updatedAt") as date, AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_hours
      FROM "Ticket"
      WHERE "status" IN ('RESOLVED', 'CLOSED')
      AND "updatedAt" >= ${start}
      GROUP BY DATE("updatedAt")
      ORDER BY DATE("updatedAt") ASC
    `;

    const dateMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, 0);
    }

    for (const r of results) {
      const key = r.date.toISOString().split('T')[0];
      if (dateMap.has(key)) {
        dateMap.set(key, Math.round(Number(r.avg_hours) * 10) / 10);
      }
    }

    return Array.from(dateMap.entries()).map(([date, avgHours]) => ({
      date,
      avgHours,
    }));
  },
};
