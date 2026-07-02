import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { useMemo } from 'react';
import type { TicketsByStatusItem } from '@/api';

// Status colors matching the ticket detail page
const STATUS_COLORS: Record<TicketsByStatusItem['status'], string> = {
  OPEN: '#6B6860', // slate
  IN_PROGRESS: '#D4943A', // amber
  RESOLVED: '#2F7D4F', // green
  CLOSED: '#1E3A5F', // muted ink
};

const STATUS_LABELS: Record<TicketsByStatusItem['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const STATUS_ORDER: TicketsByStatusItem['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

interface StatusBarChartProps {
  data: TicketsByStatusItem[];
  title?: string;
}

interface ChartDataItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
  status: TicketsByStatusItem['status'];
}

export function StatusBarChart({ data, title = 'Tickets by Status' }: StatusBarChartProps) {
  const chartData = useMemo((): ChartDataItem[] => {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return STATUS_ORDER.map(status => {
      const found = data.find(d => d.status === status);
      const count = found?.count ?? 0;
      return {
        name: STATUS_LABELS[status],
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: STATUS_COLORS[status],
        status,
      };
    });
  }, [data]);

  if (chartData.every(d => d.count === 0)) {
    return (
      <div className="h-70 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No ticket data for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="h-70" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              vertical
              strokeDasharray="0"
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <XAxis
              type="number"
              tickFormatter={v => v.toLocaleString()}
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              dy={-4}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 12, fill: '#0b0b0b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fcfcfb',
                border: '1px solid #e1e0d9',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(11,11,11,0.08)',
              }}
              labelStyle={{ color: '#0b0b0b', fontWeight: 600, fontSize: 12 }}
              formatter={(value: unknown, name: unknown) => [
                typeof value === 'number' ? value.toLocaleString() : String(value ?? ''),
                String(name ?? ''),
              ]}
              labelFormatter={(label: unknown) => String(label ?? '')}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ paddingTop: 8, paddingBottom: 4 }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
              barSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
        {chartData.map(d => (
          <span key={d.status} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded"
              style={{ backgroundColor: d.color }}
              aria-hidden="true"
            />
            {d.name} {d.count} ({d.percentage}%)
          </span>
        ))}
      </div>
    </div>
  );
}