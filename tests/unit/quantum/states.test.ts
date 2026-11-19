import { describe, expect, it } from 'vitest';
import { StateVector } from '@/lib/quantum/statevector';
import { runCircuit, runWithSnapshots, circuitDepth, countGates, packOps, type Circuit } from '@/lib/quantum/circuit';
import { bellOps, type BellKind } from '@/lib/quantum/algorithms';
import { createRng } from '@/lib/quantum/rng';
import { sampleCounts } from '@/lib/quantum/sampling';
import { C } from '@/lib/quantum/complex';
import { blochOfQubit, reducedQubit, entropyFromBloch } from '@/lib/quantum/bloch';
import { entanglementEntropyOfPure2, concurrencePure2 } from '@/lib/quantum/chsh';

const R = Math.SQRT1_2;
const expected: Record<BellKind, [number, number, number, number]> = {
  'phi+': [R, 0, 0, R],
  'phi-': [R, 0, 0, -R],
  'psi+': [0, R, R, 0],
  'psi-': [0, R, -R, 0],
};

describe('Bell states', () => {
  it.each(Object.keys(expected) as BellKind[])('%s has the right amplitudes', (kind) => {
    const s = runCircuit({ qubits: 2, columns: [bellOps(kind)] }).state;
    const target = StateVector.fromAmplitudes(expected[kind].map((x) => C(x)));
    expect(s.fidelity(target)).toBeCloseTo(1, 12);
    // exact amplitudes including sign
    for (let i = 0; i < 4; i++) expect(s.amplitude(i).re).toBeCloseTo(expected[kind][i], 12);
  });

  it.each(Object.keys(expected) as BellKind[])('%s is maximally entangled', (kind) => {
    const s = runCircuit({ qubits: 2, columns: [bellOps(kind)] }).state;
    expect(entanglementEntropyOfPure2(s)).toBeCloseTo(1, 10);
    expect(concurrencePure2(s)).toBeCloseTo(1, 10);
    const b = blochOfQubit(s, 0);
    expect(Math.hypot(...b)).toBeCloseTo(0, 10);
    expect(entropyFromBloch(b)).toBeCloseTo(1, 10);
  });

  it('measuring one half of Φ+ collapses the other to the same value', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rng = createRng(seed);
      const s = runCircuit({ qubits: 2, columns: [bellOps('phi+')] }).state;
      const a = s.measure(0, rng());
      expect(s.probOne(1)).toBeCloseTo(a, 12);
    }
  });
});

describe('basics', () => {
  it('ket ordering is big-endian: X on qubit 0 of 3 → |100⟩ = index 4', () => {
    const s = runCircuit({ qubits: 3, columns: [[{ gate: 'X', targets: [0] }]] }).state;
    expect(s.probabilities()[4]).toBeCloseTo(1);
    expect(s.label(4)).toBe('100');
  });

  it('reduced state of a product state is pure', () => {
    const s = runCircuit({
      qubits: 2,
      columns: [
        [
          { gate: 'H', targets: [0] },
          { gate: 'S', targets: [1] },
        ],
      ],
    }).state;
    const b = blochOfQubit(s, 0);
    expect(b[0]).toBeCloseTo(1, 12);
    const rho = reducedQubit(s, 1);
    expect(rho[0]).toBeCloseTo(1, 12);
  });

  it('snapshots: one per column plus the initial state', () => {
    const c: Circuit = { qubits: 1, columns: [[{ gate: 'H', targets: [0] }], [{ gate: 'Z', targets: [0] }]] };
    expect(runWithSnapshots(c)).toHaveLength(3);
  });

  it('depth and gate count', () => {
    const c = packOps(3, [
      { gate: 'H', targets: [0] },
      { gate: 'H', targets: [1] },
      { gate: 'X', targets: [2], controls: [0] },
      { gate: 'M', targets: [2] },
    ]);
    expect(countGates(c)).toBe(3);
    expect(circuitDepth(c)).toBe(3);
  });
});

describe('measurement sampling', () => {
  it('is deterministic for a given seed', () => {
    const p = Float64Array.of(0.1, 0.2, 0.3, 0.4);
    const a = sampleCounts(p, 1000, createRng(42));
    const b = sampleCounts(p, 1000, createRng(42));
    expect([...a]).toEqual([...b]);
    expect([...a].reduce((x, y) => x + y)).toBe(1000);
  });

  it('frequencies converge to Born probabilities', () => {
    const p = Float64Array.of(0.1, 0.2, 0.3, 0.4);
    const counts = sampleCounts(p, 200000, createRng(3));
    for (let i = 0; i < 4; i++) expect(counts[i] / 200000).toBeCloseTo(p[i], 2);
  });

  it('never returns zero-probability outcomes', () => {
    const p = Float64Array.of(0.5, 0, 0, 0.5);
    const counts = sampleCounts(p, 5000, createRng(8));
    expect(counts[1] + counts[2]).toBe(0);
  });

  it('collapse renormalises', () => {
    const s = runCircuit({
      qubits: 2,
      columns: [
        [
          { gate: 'H', targets: [0] },
          { gate: 'H', targets: [1] },
        ],
      ],
    }).state;
    s.collapse(0, 1);
    expect(s.norm2()).toBeCloseTo(1, 12);
    expect(s.probOne(0)).toBeCloseTo(1, 12);
  });
});
