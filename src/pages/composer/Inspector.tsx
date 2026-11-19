import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tex } from '@/ui/Tex';
import { GATE_DOCS } from '@/content/gates';
import { GATES, SINGLE_QUBIT_GATES, type SingleGateId } from '@/lib/quantum/gates';
import type { Op } from '@/lib/quantum/circuit';
import { useComposer, fits } from '@/store/composer';
import { useBi } from '@/hooks/useBi';
import { piText } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function Inspector() {
  const { t } = useTranslation();
  const bi = useBi();
  const selected = useComposer((s) => s.selected);
  const circuit = useComposer((s) => s.circuit);
  const updateOp = useComposer((s) => s.updateOp);
  const remove = useComposer((s) => s.remove);
  const [error, setError] = useState(false);
  const op = selected ? circuit.columns[selected.c]?.[selected.i] : undefined;
  if (!selected || !op) return <p className="text-sm text-muted-foreground">{t('composer.noSelection')}</p>;

  const n = circuit.qubits;
  const info = GATES[op.gate];
  const tryUpdate = (next: Op) => {
    const ok =
      fits(
        circuit.columns[selected.c].filter((_, i) => i !== selected.i),
        next,
        n,
      ) && updateOp(selected, next);
    setError(!ok);
  };
  const qubitOptions = Array.from({ length: n }, (_, q) => q);
  const docKey = op.controls?.length
    ? op.gate === 'X'
      ? op.controls.length > 1
        ? 'CCX'
        : 'CX'
      : op.gate === 'Z'
        ? 'CZ'
        : 'CU'
    : op.gate;
  const doc = GATE_DOCS[docKey];

  return (
    <div className="flex flex-col gap-4" data-testid="inspector">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg leading-tight">{doc ? bi(doc.name) : op.gate}</p>
          {doc && <p className="mt-1 text-xs text-muted-foreground">{bi(doc.desc)}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove(selected)}
          aria-label={t('composer.deleteGate')}
          data-testid="delete-gate"
        >
          <Trash2 />
        </Button>
      </div>

      {info.targets === 1 && op.gate !== 'M' && (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">U</span>
          <Select
            value={op.gate}
            onValueChange={(v) => {
              const g = v as SingleGateId;
              const need = GATES[g].params;
              const params = need ? Array.from({ length: need }, (_, k) => op.params?.[k] ?? Math.PI / 2) : undefined;
              tryUpdate({ ...op, gate: g, params });
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SINGLE_QUBIT_GATES.filter((g) => g !== 'I').map((g) => (
                <SelectItem key={g} value={g}>
                  {GATES[g].symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}

      {info.tex && op.gate !== 'M' && (
        <div className="rounded-md border border-border bg-background/60 px-2 py-2 text-center">
          <Tex math={info.tex} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="eyebrow">{info.targets === 2 ? t('composer.targets') : t('composer.target')}</span>
        <div className="flex gap-2">
          {op.targets.map((tq, k) => (
            <Select
              key={k}
              value={String(tq)}
              onValueChange={(v) => {
                const targets = [...op.targets];
                targets[k] = Number(v);
                tryUpdate({ ...op, targets, controls: op.controls?.filter((c) => !targets.includes(c)) });
              }}
            >
              <SelectTrigger className="w-24" aria-label={`${t('composer.target')} ${k + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qubitOptions.map((q) => (
                  <SelectItem key={q} value={String(q)} disabled={op.targets.includes(q) && q !== tq}>
                    q{q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </div>

      {op.gate !== 'M' && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">{t('composer.controls')}</span>
          <div className="flex flex-wrap gap-1.5">
            {qubitOptions.map((q) => {
              const isTarget = op.targets.includes(q);
              const on = op.controls?.includes(q) ?? false;
              return (
                <button
                  key={q}
                  type="button"
                  disabled={isTarget}
                  aria-pressed={on}
                  onClick={() => {
                    const controls = on
                      ? (op.controls ?? []).filter((c) => c !== q)
                      : [...(op.controls ?? []), q].sort((a, b) => a - b);
                    tryUpdate({ ...op, controls: controls.length ? controls : undefined });
                  }}
                  className={cn(
                    'num h-8 min-w-11 rounded-md border px-2 text-xs transition-colors disabled:opacity-30',
                    on ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-ink/60',
                  )}
                >
                  ● q{q}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {info.params > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">{t('composer.params')}</span>
          {Array.from({ length: info.params }, (_, k) => {
            const v = op.params?.[k] ?? 0;
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="num w-4 text-sm">{info.paramNames?.[k]}</span>
                <Slider
                  min={-16}
                  max={16}
                  step={1}
                  value={[Math.round((v / Math.PI) * 8)]}
                  onValueChange={([s]) => {
                    const params = Array.from({ length: info.params }, (_, j) => op.params?.[j] ?? 0);
                    params[k] = (s * Math.PI) / 8;
                    tryUpdate({ ...op, params });
                  }}
                  aria-label={info.paramNames?.[k] ?? 'θ'}
                />
                <span className="num w-12 text-right text-sm">{piText(v)}</span>
              </div>
            );
          })}
        </div>
      )}

      {op.gate !== 'M' && (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{t('composer.condition')}</span>
          <Select
            value={op.condition ? String(op.condition.bit) : 'none'}
            onValueChange={(v) =>
              tryUpdate({ ...op, condition: v === 'none' ? undefined : { bit: Number(v), value: 1 } })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('composer.conditionNone')}</SelectItem>
              {qubitOptions.map((q) => (
                <SelectItem key={q} value={String(q)}>
                  {t('composer.conditionOn', { bit: q })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}
      {error && <p className="text-xs text-destructive">{t('composer.invalidPlacement')}</p>}
    </div>
  );
}
