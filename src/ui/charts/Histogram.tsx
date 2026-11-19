import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { cn } from '@/lib/utils';

export interface HistogramDatum {
  label: string;
  value: number;
  /** optional expected probability marker (0…1 of total) */
  expected?: number;
  color?: string;
}

/** Vertical bar histogram (counts) with optional expected-probability ticks. SVG + d3-scale. */
export function Histogram({
  data,
  total,
  height = 140,
  className,
  ariaLabel,
}: {
  data: HistogramDatum[];
  total: number;
  height?: number;
  className?: string;
  ariaLabel: string;
}) {
  const W = 100;
  const max = Math.max(1, ...data.map((d) => Math.max(d.value / Math.max(1, total), d.expected ?? 0)));
  const y = useMemo(
    () =>
      scaleLinear()
        .domain([0, max])
        .range([height - 18, 6]),
    [max, height],
  );
  const bw = W / data.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={0}
          x2={W}
          y1={y(t * max)}
          y2={y(t * max)}
          stroke="var(--border)"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {data.map((d, i) => {
        const p = total > 0 ? d.value / total : 0;
        const x = i * bw + bw * 0.18;
        const w = bw * 0.64;
        return (
          <g key={d.label}>
            <rect
              x={x}
              width={w}
              y={y(p)}
              height={Math.max(0, y(0) - y(p))}
              fill={d.color ?? 'var(--primary)'}
              rx={0.6}
              className="transition-[y,height] duration-500 ease-out"
            />
            {d.expected !== undefined && (
              <line
                x1={x - bw * 0.08}
                x2={x + w + bw * 0.08}
                y1={y(d.expected)}
                y2={y(d.expected)}
                stroke="var(--foreground)"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      })}
      <line
        x1={0}
        x2={W}
        y1={y(0)}
        y2={y(0)}
        stroke="var(--foreground)"
        strokeOpacity={0.5}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Labels row aligned under a Histogram. */
export function HistogramLabels({ data, total }: { data: HistogramDatum[]; total: number }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-0.5 text-center">
          <span className="num text-xs text-foreground">|{d.label}⟩</span>
          <span className="num text-[0.65rem] text-muted-foreground">
            {d.value}
            {total > 0 && ` · ${((d.value / total) * 100).toFixed(1)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}
