import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeRangeSelectorProps {
  value: '7d' | '30d' | '90d';
  onChange: (value: '7d' | '30d' | '90d') => void;
  className?: string;
}

const RANGES = [
  { value: '7d' as const, label: 'Last 7 days', short: '7d' },
  { value: '30d' as const, label: 'Last 30 days', short: '30d' },
  { value: '90d' as const, label: 'Last 90 days', short: '90d' },
] as const;

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background',
          'text-sm font-medium text-foreground hover:bg-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select time range"
      >
        <Calendar className="size-4" aria-hidden="true" />
        <span>{RANGES.find((r) => r.value === value)?.short ?? value}</span>
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className=" backdrop-blur-md absolute right-0 z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg"
          role="listbox"
          aria-label="Time range options"
        >
          {RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              role="option"
              aria-selected={range.value === value}
              onClick={() => {
                onChange(range.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-sm text-popover-foreground',
                'hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                range.value === value && 'bg-muted font-medium',
              )}
            >
              <span className="flex-1 text-left">{range.label}</span>
              {range.value === value && (
                <Check className="size-4 text-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
