import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/storage';
import type { Circuit, Op } from '@/lib/quantum/circuit';
import { opQubits } from '@/lib/quantum/circuit';
import { CircuitSchema } from '@/lib/quantum/schema';
import { normalizeCircuit } from '@/lib/quantum/serialize';

export const MAX_COMPOSER_QUBITS = 8;
export const MIN_COLUMNS = 14;

export interface Cell {
  q: number;
  c: number;
}

/** Visual span of an op: every wire between its lowest and highest qubit. */
export function opSpan(op: Op): [number, number] {
  const qs = opQubits(op);
  return [Math.min(...qs), Math.max(...qs)];
}

function spansOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

/** Can `op` be placed in `column` (ignoring the op at index `ignore`)? */
export function fits(column: Op[], op: Op, qubits: number, ignore = -1): boolean {
  const qs = opQubits(op);
  if (qs.some((q) => q < 0 || q >= qubits)) return false;
  if (new Set(qs).size !== qs.length) return false;
  const span = opSpan(op);
  return column.every((o, i) => i === ignore || !spansOverlap(opSpan(o), span));
}

/** Ensure trailing empty columns so there is always room to drop. */
function padColumns(columns: Op[][]): Op[][] {
  let last = columns.length;
  while (last > 0 && columns[last - 1].length === 0) last--;
  const out = columns.slice(0, last).map((c) => c.slice());
  while (out.length < Math.max(MIN_COLUMNS, last + 3)) out.push([]);
  return out;
}

/** Remove fully empty columns between ops (compaction), keep padding. */
export function compact(c: Circuit): Circuit {
  return { qubits: c.qubits, columns: padColumns(c.columns.filter((col) => col.length > 0)) };
}

interface ComposerState {
  circuit: Circuit;
  name: string;
  past: Circuit[];
  future: Circuit[];
  /** selected op: column + index within column */
  selected: { c: number; i: number } | null;
  /** true when the user explicitly opened a gate for editing (drives the mobile inspector sheet) */
  inspecting: boolean;
  /** tap-to-place tool */
  tool: Op | null;
  /** step-through position (0 = initial state, k = after column k) ; null = end */
  step: number | null;
  view: 'city' | 'qsphere' | 'bloch';
  seed: number;

  setCircuit: (c: Circuit, opts?: { record?: boolean; name?: string }) => void;
  place: (op: Op, c: number) => boolean;
  move: (from: { c: number; i: number }, to: Cell) => boolean;
  updateOp: (at: { c: number; i: number }, op: Op) => boolean;
  remove: (at: { c: number; i: number }) => void;
  setQubits: (n: number) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  select: (s: { c: number; i: number } | null, inspect?: boolean) => void;
  setTool: (op: Op | null) => void;
  setStep: (s: number | null) => void;
  setView: (v: ComposerState['view']) => void;
  setSeed: (s: number) => void;
  setName: (n: string) => void;
}

const initial: Circuit = { qubits: 3, columns: padColumns([]) };

export const useComposer = create<ComposerState>()(
  persist(
    (set, get) => {
      const commit = (next: Circuit, extra: Partial<ComposerState> = {}) => {
        const { circuit, past } = get();
        set({ circuit: next, past: [...past.slice(-99), circuit], future: [], inspecting: false, ...extra });
      };
      return {
        circuit: initial,
        name: '',
        past: [],
        future: [],
        selected: null,
        inspecting: false,
        tool: null,
        step: null,
        view: 'city',
        seed: 1234,

        setCircuit: (c, opts = {}) => {
          const next = { qubits: c.qubits, columns: padColumns(c.columns) };
          if (opts.record === false) set({ circuit: next, selected: null, step: null });
          else commit(next, { selected: null, step: null });
          if (opts.name !== undefined) set({ name: opts.name });
        },

        place: (op, c) => {
          const { circuit } = get();
          const cols = circuit.columns.map((col) => col.slice());
          while (cols.length <= c) cols.push([]);
          if (!fits(cols[c], op, circuit.qubits)) {
            // insert a fresh column at c so the gate always lands where it was dropped
            cols.splice(c, 0, []);
          }
          cols[c].push(op);
          commit({ qubits: circuit.qubits, columns: padColumns(cols) }, { selected: { c, i: cols[c].length - 1 } });
          return true;
        },

        move: (from, to) => {
          const { circuit } = get();
          const op = circuit.columns[from.c]?.[from.i];
          if (!op) return false;
          const [lo] = opSpan(op);
          const shift = to.q - lo;
          const moved: Op = {
            ...op,
            targets: op.targets.map((q) => q + shift),
            controls: op.controls?.map((q) => q + shift),
            condition: op.condition,
          };
          if ([...moved.targets, ...(moved.controls ?? [])].some((q) => q < 0 || q >= circuit.qubits)) return false;
          const cols = circuit.columns.map((col) => col.slice());
          cols[from.c].splice(from.i, 1);
          while (cols.length <= to.c) cols.push([]);
          if (!fits(cols[to.c], moved, circuit.qubits)) cols.splice(to.c, 0, []);
          cols[to.c].push(moved);
          commit(
            { qubits: circuit.qubits, columns: padColumns(cols) },
            { selected: { c: to.c, i: cols[to.c].length - 1 } },
          );
          return true;
        },

        updateOp: (at, op) => {
          const { circuit } = get();
          const col = circuit.columns[at.c];
          if (!col || !fits(col, op, circuit.qubits, at.i)) return false;
          const cols = circuit.columns.map((c) => c.slice());
          cols[at.c][at.i] = op;
          commit({ qubits: circuit.qubits, columns: cols });
          return true;
        },

        remove: (at) => {
          const { circuit } = get();
          const cols = circuit.columns.map((c) => c.slice());
          cols[at.c]?.splice(at.i, 1);
          commit({ qubits: circuit.qubits, columns: padColumns(cols) }, { selected: null });
        },

        setQubits: (n) => {
          const { circuit } = get();
          const q = Math.max(1, Math.min(MAX_COMPOSER_QUBITS, n));
          // drop ops that touch removed wires
          const cols = circuit.columns.map((col) =>
            col.filter((op) => opQubits(op).every((x) => x < q) && (!op.condition || op.condition.bit < q)),
          );
          commit({ qubits: q, columns: padColumns(cols) }, { selected: null, step: null });
        },

        clear: () => commit({ qubits: get().circuit.qubits, columns: padColumns([]) }, { selected: null, step: null }),

        undo: () => {
          const { past, circuit, future } = get();
          const prev = past[past.length - 1];
          if (!prev) return;
          set({ circuit: prev, past: past.slice(0, -1), future: [circuit, ...future], selected: null });
        },
        redo: () => {
          const { past, circuit, future } = get();
          const next = future[0];
          if (!next) return;
          set({ circuit: next, past: [...past, circuit], future: future.slice(1), selected: null });
        },

        select: (selected, inspect = false) => set({ selected, inspecting: inspect && selected !== null }),
        setTool: (tool) => set({ tool }),
        setStep: (step) => set({ step }),
        setView: (view) => set({ view }),
        setSeed: (seed) => set({ seed }),
        setName: (name) => set({ name }),
      };
    },
    {
      name: 'spooky-composer',
      storage: safeJSONStorage,
      version: 1,
      partialize: (s) => ({ circuit: normalizeCircuit(s.circuit), name: s.name, view: s.view, seed: s.seed }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ComposerState> | undefined;
        const ok = p?.circuit && CircuitSchema.safeParse(p.circuit).success && p.circuit.qubits <= MAX_COMPOSER_QUBITS;
        return {
          ...current,
          ...(p ?? {}),
          circuit: ok ? { qubits: p!.circuit!.qubits, columns: padColumns(p!.circuit!.columns) } : current.circuit,
        };
      },
    },
  ),
);
