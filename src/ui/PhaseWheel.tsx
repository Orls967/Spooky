import { useMemo } from 'react';
import { phaseConicGradient } from '@/lib/color';
import { cn } from '@/lib/utils';

/** Legend for the cyclic phase colormap (complex-plane orientation: 0 → right, π/2 → up). */
export function PhaseWheel({ size = 56, className, label }: { size?: number; className?: string; label?: string }) {
  const bg = useMemo(() => phaseConicGradient(48), []);
  return (
    <figure className={cn('inline-flex items-center gap-3', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: bg,
            mask: 'radial-gradient(circle, transparent 42%, #000 44%)',
            WebkitMask: 'radial-gradient(circle, transparent 42%, #000 44%)',
          }}
        />
        <span className="num absolute top-1/2 -right-3 -translate-y-1/2 text-[0.6rem] text-muted-foreground">0</span>
        <span className="num absolute -top-3 left-1/2 -translate-x-1/2 text-[0.6rem] text-muted-foreground">π/2</span>
        <span className="num absolute top-1/2 -left-2.5 -translate-y-1/2 text-[0.6rem] text-muted-foreground">π</span>
        <span className="num absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[0.6rem] text-muted-foreground">
          3π/2
        </span>
      </div>
      {label && <figcaption className="text-xs text-muted-foreground">{label}</figcaption>}
    </figure>
  );
}
