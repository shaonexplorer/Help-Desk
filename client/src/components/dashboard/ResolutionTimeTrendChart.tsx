import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { useMemo } from 'react';
import type { ResolutionTimeTrendItem } from '@/api';

interface ResolutionTimeTrendChartProps {
  data: ResolutionTimeTrendItem[];
  title?: string;
}

export function ResolutionTimeTrendChart({
  data,
  title = 'Avg Resolution Time (hrs)',
}: ResolutionTimeTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: d.date,
      label: d.date.split('-').slice(1).join('/'),
      avgHours: d.avgHours,
    }));
  }, [data]);

  const hasData = chartData.some((d) => d.avgHours > 0);

  if (!hasData) {
    return (
      <div className="h-70 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No resolution data for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="h-70" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="0"
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              dy={4}
              tickCount={Math.min(8, chartData.length)}
            />
            <YAxis
              type="number"
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              dx={-4}
              tickFormatter={(v) => `${v}h`}
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
                typeof value === 'number' ? `${value.toFixed(1)}h` : String(value ?? ''),
                String(name ?? ''),
              ]}
              labelFormatter={(label: unknown) => String(label ?? '')}
            />
            <Line
              type="monotone"
              dataKey="avgHours"
              stroke="#2a78d6"
              strokeWidth={2}
              dot={<Dot r={4} fill="#2a78d6" strokeWidth={2} stroke="#fcfcfb" />}
              activeDot={{ r: 6, strokeWidth: 2 }}
              connectNulls={true}
              name="Avg Hours"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
