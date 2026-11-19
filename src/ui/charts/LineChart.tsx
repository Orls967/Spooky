import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { cn } from '@/lib/utils';

export interface Series {
  points: { x: number; y: number }[];
  color: string;
  width?: number;
}
export interface RefLine {
  y: number;
  label: string;
  color?: string;
}

/** Small responsive SVG line chart (d3-scale + d3-shape) with reference lines and an optional marker. */
export function LineChart({
  series,
  refs = [],
  xDomain,
  yDomain,
  marker,
  height = 160,
  className,
  ariaLabel,
  xTicks = [],
  yFormat = (v: number) => v.toFixed(2),
}: {
  series: Series[];
  refs?: RefLine[];
  xDomain: [number, number];
  yDomain: [number, number];
  marker?: { x: number; y: number; color?: string };
  height?: number;
  className?: string;
  ariaLabel: string;
  xTicks?: { v: number; label: string }[];
  yFormat?: (v: number) => string;
}) {
  const W = 320;
  const pad = { l: 34, r: 8, t: 8, b: 20 };
  const x = useMemo(
    () =>
      scaleLinear()
        .domain(xDomain)
        .range([pad.l, W - pad.r]),
    [xDomain, pad.l, pad.r],
  );
  const y = useMemo(
    () =>
      scaleLinear()
        .domain(yDomain)
        .range([height - pad.b, pad.t]),
    [yDomain, height, pad.b, pad.t],
  );
  const paths = useMemo(
    () =>
      series.map(
        (s) =>
          line<{ x: number; y: number }>()
            .x((d) => x(d.x))
            .y((d) => y(d.y))
            .curve(curveMonotoneX)(s.points) ?? '',
      ),
    [series, x, y],
  );
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      {y.ticks(4).map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={0.6} />
          <text
            x={pad.l - 5}
            y={y(t)}
            dy="0.32em"
            textAnchor="end"
            className="fill-muted-foreground font-mono text-[8px]"
          >
            {yFormat(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={t.v}
          x={x(t.v)}
          y={height - 5}
          textAnchor="middle"
          className="fill-muted-foreground font-mono text-[8px]"
        >
          {t.label}
        </text>
      ))}
      {refs.map((r) => (
        <g key={r.label}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(r.y)}
            y2={y(r.y)}
            stroke={r.color ?? 'var(--foreground)'}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <text
            x={W - pad.r - 2}
            y={y(r.y) - 3}
            textAnchor="end"
            className="font-mono text-[8px]"
            fill={r.color ?? 'var(--foreground)'}
          >
            {r.label}
          </text>
        </g>
      ))}
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={series[i].color}
          strokeWidth={series[i].width ?? 1.8}
          strokeLinejoin="round"
        />
      ))}
      {marker && (
        <circle
          cx={x(marker.x)}
          cy={y(marker.y)}
          r={4}
          fill={marker.color ?? 'var(--primary)'}
          stroke="var(--card)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
