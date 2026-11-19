import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CELL, GUTTER, opLabel, targetGlyph } from '@/lib/circuitSvg';
import type { Circuit, Op } from '@/lib/quantum/circuit';
import { opQubits } from '@/lib/quantum/circuit';
import { useComposer } from '@/store/composer';

const yOf = (q: number) => q * CELL + CELL / 2;

/** One drop target per (qubit, column). Also a tap target for the armed tool. */
const DropCell = memo(function DropCell({
  q,
  c,
  onTap,
}: {
  q: number;
  c: number;
  onTap: (q: number, c: number) => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${q}-${c}`, data: { q, c } });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={t('composer.cellLabel', { q, c: c + 1 })}
      data-testid={`cell-${q}-${c}`}
      onClick={() => onTap(q, c)}
      className={cn(
        'absolute rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        isOver ? 'bg-primary/15 ring-1 ring-primary/60' : 'hover:bg-foreground/[0.04]',
      )}
      style={{ left: c * CELL + 4, top: q * CELL + 4, width: CELL - 8, height: CELL - 8 }}
    />
  );
});

function Meter() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path d="M4 16 A 9 9 0 0 1 20 16" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="16" x2="17" y2="7" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A placed operation (draggable, selectable). */
function PlacedOp({ op, c, i, selected, past }: { op: Op; c: number; i: number; selected: boolean; past: boolean }) {
  const select = useComposer((s) => s.select);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `op-${c}-${i}`,
    data: { kind: 'op', c, i },
  });
  const qs = opQubits(op);
  const lo = Math.min(...qs),
    hi = Math.max(...qs);
  const glyph = targetGlyph(op);
  const { symbol, sub } = opLabel(op);
  const x = c * CELL + CELL / 2;
  return (
    <div
      className={cn('absolute transition-opacity', isDragging && 'opacity-30', !past && 'opacity-45')}
      style={{ left: x - CELL / 2, top: lo * CELL, width: CELL, height: (hi - lo + 1) * CELL }}
    >
      {hi > lo && (
        <span
          className="absolute w-[2px] -translate-x-1/2 bg-ink"
          style={{ left: CELL / 2, top: CELL / 2, height: (hi - lo) * CELL }}
        />
      )}
      {(op.controls ?? []).map((cq) => (
        <span
          key={cq}
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: CELL / 2, top: yOf(cq - lo) }}
        />
      ))}
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={(e) => {
          e.stopPropagation();
          select({ c, i }, true);
        }}
        aria-label={`${symbol} q${op.targets.join(',q')}`}
        data-testid={`op-${c}-${i}`}
        className="absolute inset-0 cursor-grab touch-none focus-visible:outline-none active:cursor-grabbing"
      >
        {op.targets.map((tq) => {
          const top = yOf(tq - lo);
          if (glyph === 'oplus')
            return (
              <span
                key={tq}
                className={cn(
                  'absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-card text-ink',
                  selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={{ left: CELL / 2, top }}
              >
                <svg viewBox="0 0 20 20" className="size-full">
                  <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="2" />
                  <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            );
          if (glyph === 'dot')
            return (
              <span
                key={tq}
                className={cn(
                  'absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink',
                  selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={{ left: CELL / 2, top }}
              />
            );
          if (glyph === 'swap')
            return (
              <span
                key={tq}
                className={cn('absolute -translate-x-1/2 -translate-y-1/2 text-ink', selected && 'text-primary')}
                style={{ left: CELL / 2, top }}
              >
                <svg viewBox="0 0 16 16" className="size-4">
                  <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              </span>
            );
          return (
            <span
              key={tq}
              className={cn(
                'absolute flex size-10 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[5px] border bg-card font-mono leading-none text-foreground shadow-[0_1px_0_hsl(var(--shadow-color)/0.08)] transition-[box-shadow,border-color]',
                glyph === 'meter' ? 'border-ink/70' : 'border-ink/80',
                selected ? 'border-primary ring-2 ring-primary/40' : 'hover:border-primary/70',
              )}
              style={{ left: CELL / 2, top }}
            >
              {glyph === 'meter' ? (
                <Meter />
              ) : (
                <>
                  <span className={cn('font-semibold', symbol.length > 2 ? 'text-[0.7rem]' : 'text-sm')}>{symbol}</span>
                  {sub && <span className="mt-0.5 text-[0.55rem] text-muted-foreground">{sub}</span>}
                </>
              )}
            </span>
          );
        })}
        {op.condition && (
          <span
            className="absolute -translate-x-1/2 font-mono text-[0.6rem] text-primary"
            style={{ left: CELL / 2, top: yOf(op.targets[0] - lo) - 31 }}
          >
            c{op.condition.bit}={op.condition.value}
          </span>
        )}
      </button>
    </div>
  );
}

export function CircuitGrid({
  circuit,
  step,
  onTapCell,
  onStep,
}: {
  circuit: Circuit;
  step: number;
  onTapCell: (q: number, c: number) => void;
  onStep: (s: number) => void;
}) {
  const { t } = useTranslation();
  const selected = useComposer((s) => s.selected);
  const cols = circuit.columns.length;
  const width = cols * CELL;
  const height = circuit.qubits * CELL;
  return (
    <div className="relative overflow-x-auto overscroll-x-contain pb-2" data-testid="circuit-grid">
      <div className="relative" style={{ width: GUTTER + width + 16, height: height + 26 }}>
        {/* column headers / step markers */}
        <div className="absolute flex" style={{ left: GUTTER, top: 0, height: 20 }}>
          {Array.from({ length: cols }, (_, c) => (
            <button
              key={c}
              type="button"
              onClick={() => onStep(c + 1)}
              aria-label={t('composer.columnLabel', { c: c + 1 })}
              className={cn(
                'num text-center text-[0.6rem] transition-colors hover:text-primary',
                c < step ? 'text-muted-foreground' : 'text-muted-foreground/40',
              )}
              style={{ width: CELL }}
            >
              {c + 1}
            </button>
          ))}
        </div>
        <div className="absolute" style={{ left: 0, top: 22 }}>
          {Array.from({ length: circuit.qubits }, (_, q) => (
            <div
              key={q}
              className="absolute flex items-center gap-1.5 pl-1"
              style={{ top: q * CELL, height: CELL, width: GUTTER }}
            >
              <span className="num text-xs text-foreground">q{q}</span>
              <span className="num text-[0.65rem] text-muted-foreground">|0⟩</span>
            </div>
          ))}
        </div>
        <div className="absolute" style={{ left: GUTTER, top: 22, width, height }}>
          {/* executed region tint */}
          <div
            className="absolute inset-y-0 left-0 bg-primary/[0.05] transition-[width] duration-300"
            style={{ width: step * CELL }}
          />
          {Array.from({ length: circuit.qubits }, (_, q) => (
            <span key={q} className="absolute h-px bg-ink/45" style={{ top: yOf(q), left: -8, right: 0 }} />
          ))}
          {/* playhead */}
          <span
            className="absolute inset-y-[-6px] w-[2px] rounded-full bg-primary transition-[left] duration-300"
            style={{ left: step * CELL - 1 }}
            aria-hidden
          />
          {Array.from({ length: cols }, (_, c) =>
            Array.from({ length: circuit.qubits }, (_, q) => (
              <DropCell key={`${q}-${c}`} q={q} c={c} onTap={onTapCell} />
            )),
          )}
          {circuit.columns.map((col, c) =>
            col.map((op, i) => (
              <PlacedOp
                key={`${c}-${i}`}
                op={op}
                c={c}
                i={i}
                selected={selected?.c === c && selected.i === i}
                past={c < step}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
