import { beforeEach, describe, expect, it } from 'vitest';
import { useComposer, fits, compact } from '@/store/composer';
import { PALETTE_BY_KEY } from '@/pages/composer/palette';
import { runCircuit } from '@/lib/quantum/circuit';

const S = () => useComposer.getState();

describe('composer store', () => {
  beforeEach(() => {
    S().setCircuit({ qubits: 2, columns: [] }, { record: false });
  });

  it('places gates and simulates a Bell pair', () => {
    S().place(PALETTE_BY_KEY.H.make(0, 2)!, 0);
    S().place(PALETTE_BY_KEY.CX.make(0, 2)!, 1);
    const p = runCircuit(S().circuit).state.probabilities();
    expect(p[0]).toBeCloseTo(0.5);
    expect(p[3]).toBeCloseTo(0.5);
  });

  it('dropping onto an occupied span inserts a new column instead of overlapping', () => {
    S().place(PALETTE_BY_KEY.CX.make(0, 2)!, 0);
    S().place(PALETTE_BY_KEY.H.make(1, 2)!, 0);
    const cols = S().circuit.columns;
    expect(cols[0]).toHaveLength(1);
    expect(cols[1]).toHaveLength(1);
    expect(cols[0][0].gate).toBe('H');
  });

  it('undo / redo restore exact circuits', () => {
    S().place(PALETTE_BY_KEY.X.make(1, 2)!, 0);
    const after = S().circuit;
    S().undo();
    expect(S().circuit.columns.flat()).toHaveLength(0);
    S().redo();
    expect(S().circuit).toEqual(after);
  });

  it('moves a gate to another wire and column', () => {
    S().place(PALETTE_BY_KEY.X.make(0, 2)!, 0);
    S().move({ c: 0, i: 0 }, { q: 1, c: 3 });
    const flat = S().circuit.columns.flatMap((col, c) => col.map((op) => ({ c, op })));
    expect(flat).toHaveLength(1);
    expect(flat[0].c).toBe(3);
    expect(flat[0].op.targets).toEqual([1]);
  });

  it('removing a qubit drops gates on that wire', () => {
    S().setQubits(3);
    S().place(PALETTE_BY_KEY.X.make(2, 3)!, 0);
    S().setQubits(2);
    expect(S().circuit.columns.flat()).toHaveLength(0);
  });

  it('fits() respects spans and bounds', () => {
    expect(fits([{ gate: 'X', targets: [2], controls: [0] }], { gate: 'H', targets: [1] }, 3)).toBe(false);
    expect(fits([{ gate: 'X', targets: [1], controls: [0] }], { gate: 'H', targets: [2] }, 3)).toBe(true);
    expect(fits([], { gate: 'H', targets: [3] }, 3)).toBe(false);
  });

  it('compact() removes empty columns between gates', () => {
    const c = compact({ qubits: 1, columns: [[], [{ gate: 'H', targets: [0] }], [], [{ gate: 'Z', targets: [0] }]] });
    expect(c.columns[0][0].gate).toBe('H');
    expect(c.columns[1][0].gate).toBe('Z');
  });
});
