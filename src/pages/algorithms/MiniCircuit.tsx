import { useMemo } from 'react';
import { CELL, GUTTER, circuitToSVG, diagramColors } from '@/lib/circuitSvg';
import type { Circuit } from '@/lib/quantum/circuit';
import { useResolvedTheme } from '@/store/settings';

/** Read-only circuit diagram with the active stage highlighted. */
export function MiniCircuit({
  circuit,
  from,
  to,
  label,
}: {
  circuit: Circuit;
  from: number;
  to: number;
  label: string;
}) {
  const dark = useResolvedTheme((s) => s.resolved) === 'dark';
  const svg = useMemo(() => circuitToSVG(circuit, { ...diagramColors(dark), paper: 'transparent' }), [circuit, dark]);
  return (
    <div className="relative overflow-x-auto" role="img" aria-label={label}>
      <div className="relative w-max">
        {to > from && (
          <div
            className="absolute top-1 bottom-1 rounded-md border border-primary/50 bg-primary/10 transition-[left,width] duration-500 ease-out"
            style={{ left: GUTTER + from * CELL, width: (to - from) * CELL }}
          />
        )}
        <div className="relative" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  );
}
