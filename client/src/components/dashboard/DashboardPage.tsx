import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Clock, TicketX, TicketPlus } from 'lucide-react';
import { StatCard } from './StatCard';
import { TimeRangeSelector } from './TimeRangeSelector';
import { StatusBarChart } from './StatusBarChart';
import { PriorityBarChart } from './PriorityBarChart';
import { CategoryBarChart } from './CategoryBarChart';
import { TicketsOverTimeChart } from './TicketsOverTimeChart';
import { ResolutionTimeTrendChart } from './ResolutionTimeTrendChart';
import {
  fetchDashboardStats,
  fetchTicketsByStatus,
  fetchTicketsByPriority,
  fetchTicketsByCategory,
  fetchTicketsOverTime,
  fetchResolutionTimeTrend,
  type DashboardRange,
} from '@/api';

export function Dashboard() {
  const [range, setRange] = useState<DashboardRange>('30d');

  // Fetch all dashboard data in parallel
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats', range],
    queryFn: () => fetchDashboardStats({ range }),
  });

  const statusQuery = useQuery({
    queryKey: ['dashboard', 'tickets-by-status', range],
    queryFn: () => fetchTicketsByStatus({ range }),
  });

  const priorityQuery = useQuery({
    queryKey: ['dashboard', 'tickets-by-priority', range],
    queryFn: () => fetchTicketsByPriority({ range }),
  });

  const categoryQuery = useQuery({
    queryKey: ['dashboard', 'tickets-by-category', range],
    queryFn: () => fetchTicketsByCategory({ range }),
  });

  const overTimeQuery = useQuery({
    queryKey: ['dashboard', 'tickets-over-time', range],
    queryFn: () => fetchTicketsOverTime({ range }),
  });

  const resolutionQuery = useQuery({
    queryKey: ['dashboard', 'resolution-time-trend', range],
    queryFn: () => fetchResolutionTimeTrend({ range }),
  });

  const isLoading =
    statsQuery.isLoading ||
    statusQuery.isLoading ||
    priorityQuery.isLoading ||
    categoryQuery.isLoading ||
    overTimeQuery.isLoading ||
    resolutionQuery.isLoading;

  const isError =
    statsQuery.isError ||
    statusQuery.isError ||
    priorityQuery.isError ||
    categoryQuery.isError ||
    overTimeQuery.isError ||
    resolutionQuery.isError;

  // console.log(resolutionQuery.isError);

  const stats = statsQuery.data?.stats;
  const statusData = statusQuery.data?.data ?? [];
  const priorityData = priorityQuery.data?.data ?? [];
  const categoryData = categoryQuery.data?.data ?? [];
  const overTimeData = overTimeQuery.data?.data ?? [];
  const resolutionData = resolutionQuery.data?.data ?? [];

  if (isLoading) {
    return (
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Loading dashboard data…</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-70 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  // if (isError) {
  //   return (
  //     <main className="flex-1 p-6 space-y-6">
  //       <div className="flex items-center justify-between">
  //         <div>
  //           <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
  //           <p className="text-sm text-muted-foreground">Analytical overview of your help desk</p>
  //         </div>
  //       </div>
  //       <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
  //         <p className="text-destructive text-sm">Failed to load dashboard data. Please try again.</p>
  //       </div>
  //     </main>
  //   );
  // }

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* Header with time range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Analytical overview of your help desk</p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tickets"
          value={stats?.totalTickets ?? 0}
          icon={<TicketPlus className="size-5 text-blue-600" />}
          delta={stats?.delta}
          deltaLabel="vs previous period"
        />
        <StatCard
          label="Open Tickets"
          value={stats?.openTickets ?? 0}
          icon={<TicketX className="size-5 text-slate-600" />}
        />
        <StatCard
          label="Avg Resolution"
          value={`${stats?.avgResolutionHours ?? 0}h`}
          icon={<Clock className="size-5 text-amber-600" />}
        />
        <StatCard
          label="Active Agents"
          value={stats?.activeAgents ?? 0}
          icon={<Users className="size-5 text-green-600" />}
        />
      </div>

      {/* Charts Row 1: Status, Priority, Category */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <StatusBarChart data={statusData} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <PriorityBarChart data={priorityData} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <CategoryBarChart data={categoryData} />
        </div>
      </div>

      {/* Charts Row 2: Tickets Over Time, Resolution Time Trend */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 lg:col-span-1">
          <TicketsOverTimeChart data={overTimeData} />
        </div>
        <div className="rounded-lg border bg-card p-4 lg:col-span-1">
          <ResolutionTimeTrendChart data={resolutionData} />
        </div>
      </div>
    </main>
  );
}
