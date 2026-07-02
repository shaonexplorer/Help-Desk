import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage change
  deltaLabel?: string; // e.g. "vs last 30 days"
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  className = '',
}: StatCardProps) {
  const deltaColor =
    delta === undefined || delta === 0
      ? 'text-muted-foreground'
      : delta > 0
        ? 'text-green-600'
        : 'text-red-600';

  const deltaIcon =
    delta === undefined || delta === 0
      ? <Minus className="size-3" />
      : delta > 0
        ? <TrendingUp className="size-3" />
        : <TrendingDown className="size-3" />;

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-lg border bg-card ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
            {icon}
          </div>
        )}
      </div>
      {(delta !== undefined && delta !== 0) && deltaLabel && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: deltaColor }}>
          {deltaIcon}
          <span className="font-medium">{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}