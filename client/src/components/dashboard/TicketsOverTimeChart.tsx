import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMemo } from 'react';
import type { TicketsOverTimeItem } from '@/api';

const STATUS_COLORS = {
  OPEN: '#6B6860',
  IN_PROGRESS: '#D4943A',
  RESOLVED: '#2F7D4F',
  CLOSED: '#1E3A5F',
};

const STATUS_LABELS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

interface TicketsOverTimeChartProps {
  data: TicketsOverTimeItem[];
  title?: string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TicketsOverTimeChart({ data, title = 'Tickets Over Time' }: TicketsOverTimeChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];
    return data.map(d => ({
      date: d.date,
      label: formatDateLabel(d.date),
      OPEN: d.OPEN,
      IN_PROGRESS: d.IN_PROGRESS,
      RESOLVED: d.RESOLVED,
      CLOSED: d.CLOSED,
      total: d.total,
    }));
  }, [data]);

  if (!chartData.length) {
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
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {STATUS_ORDER.map(status => (
                <linearGradient key={status} id={`color-${status.toLowerCase()}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS[status]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={STATUS_COLORS[status]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="0"
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <XAxis
              dataKey="label"
              type="category"
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              dy={-4}
              tickCount={Math.min(chartData.length, 10)}
            />
            <YAxis
              type="number"
              tickFormatter={v => v.toLocaleString()}
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              dx={4}
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
            {STATUS_ORDER.map(status => (
              <Area
                key={status}
                type="monotone"
                dataKey={status}
                stackId="1"
                stroke={STATUS_COLORS[status]}
                fillOpacity={1}
                fill={`url(#color-${status.toLowerCase()})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
        {STATUS_ORDER.map(status => (
          <span key={status} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded"
              style={{ backgroundColor: STATUS_COLORS[status] }}
              aria-hidden="true"
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </div>
  );
}