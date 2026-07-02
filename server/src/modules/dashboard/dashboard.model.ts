import prisma from '../../prisma';
import { rangeToStartDate } from './dashboard.validation';
import { TICKET_CATEGORIES, TICKET_STATUSES, PRIORITIES } from '../tickets/ticket.validation';

export const DashboardModel = {
  getRangeStart(range?: '7d' | '30d' | '90d'): Date {
    return rangeToStartDate(range);
  },

  getPreviousRangeStart(range?: '7d' | '30d' | '90d'): Date {
    const currentStart = rangeToStartDate(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - days);
    return prevStart;
  },

  async getStats(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const prevStart = this.getPreviousRangeStart(range);

    // Grouping the status counts reduces 4 separate queries down into 1 database trip
    const [
      totalTickets,
      statusGroups,
      ticketsThisPeriod,
      ticketsPrevPeriod,
      avgResolutionTime,
      activeAgents,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.ticket.count({ where: { createdAt: { gte: start } } }),
      prisma.ticket.count({ where: { createdAt: { gte: prevStart, lt: start } } }),
      // Properly parameterized template tag prevents SQL Injection natively
      prisma.$queryRaw<{ avg_hours: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_hours
        FROM "ticket"
        WHERE "status" IN ('RESOLVED', 'CLOSED')
        AND "updatedAt" >= ${start}
      `,
      prisma.user.count({
        where: {
          role: 'AGENT',
          deletedAt: null,
          assignedTickets: {
            some: { createdAt: { gte: start } },
          },
        },
      }),
    ]);

    // Map group-by array values back to static individual variables for compatibility
    const counts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count.id]));
    const openTickets = counts['OPEN'] ?? 0;
    const inProgressTickets = counts['IN_PROGRESS'] ?? 0;
    const resolvedTickets = counts['RESOLVED'] ?? 0;
    const closedTickets = counts['CLOSED'] ?? 0;

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

  async getTicketsByStatus(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const results = await prisma.ticket.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start } },
      _count: { status: true },
    });

    const map = new Map(results.map((r) => [r.status, r._count.status]));
    return TICKET_STATUSES.map((status) => ({
      status,
      count: map.get(status) ?? 0,
    }));
  },

  async getTicketsByPriority(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const results = await prisma.ticket.groupBy({
      by: ['priority'],
      where: { createdAt: { gte: start } },
      _count: { priority: true },
    });

    const map = new Map(results.map((r) => [r.priority, r._count.priority]));
    return PRIORITIES.map((priority) => ({
      priority,
      count: map.get(priority) ?? 0,
    }));
  },

  async getTicketsByCategory(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const results = await prisma.ticket.groupBy({
      by: ['category'],
      where: { createdAt: { gte: start } },
      _count: { category: true },
    });

    const map = new Map(results.map((r) => [r.category, r._count.category]));
    return TICKET_CATEGORIES.map((category) => ({
      category,
      count: map.get(category) ?? 0,
    }));
  },

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

  async getTicketsOverTime(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    // Fixed SQL execution + ensured string casting for standard ISO format parsing
    const results = await prisma.$queryRaw<{ date: string; count: bigint; status: string }[]>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as date, "status", COUNT(*) as count
      FROM "ticket"
      WHERE "createdAt" >= ${start}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD'), "status"
      ORDER BY date ASC
    `;

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
      const existing = dateMap.get(r.date);
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

  async getResolutionTimeTrend(range?: '7d' | '30d' | '90d') {
    const start = this.getRangeStart(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const results = await prisma.$queryRaw<{ date: string; avg_hours: number }[]>`
      SELECT TO_CHAR("updatedAt", 'YYYY-MM-DD') as date, AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_hours
      FROM "ticket"
      WHERE "status" IN ('RESOLVED', 'CLOSED')
      AND "updatedAt" >= ${start}
      GROUP BY TO_CHAR("updatedAt", 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    const dateMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, 0);
    }

    for (const r of results) {
      if (dateMap.has(r.date)) {
        dateMap.set(r.date, Math.round(Number(r.avg_hours) * 10) / 10);
      }
    }

    return Array.from(dateMap.entries()).map(([date, avgHours]) => ({
      date,
      avgHours,
    }));
  },
};
