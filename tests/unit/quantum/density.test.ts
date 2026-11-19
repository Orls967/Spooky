import { describe, expect, it } from 'vitest';
import { DensityMatrix } from '@/lib/quantum/density';
import { runCircuit } from '@/lib/quantum/circuit';
import { bellOps } from '@/lib/quantum/algorithms';
import { gateMatrix } from '@/lib/quantum/gates';
import { blochFromRho, reducedQubit } from '@/lib/quantum/bloch';
import { createRng } from '@/lib/quantum/rng';
import { randomState } from './helpers';

const bell = () => DensityMatrix.fromState(runCircuit({ qubits: 2, columns: [bellOps('phi+')] }).state);
const plus = () => DensityMatrix.fromState(runCircuit({ qubits: 1, columns: [[{ gate: 'H', targets: [0] }]] }).state);

describe('density matrix', () => {
  it('pure state: trace 1, purity 1, entropy 0', () => {
    const r = DensityMatrix.fromState(randomState(3, createRng(1)));
    expect(r.trace()).toBeCloseTo(1, 12);
    expect(r.purity()).toBeCloseTo(1, 12);
    expect(r.entropy()).toBeCloseTo(0, 8);
  });

  it('unitary evolution matches the state-vector simulator', () => {
    const rng = createRng(2);
    const s = randomState(3, rng);
    const r = DensityMatrix.fromState(s);
    const ops = [
      { t: 0, m: gateMatrix('H'), c: [] as number[] },
      { t: 2, m: gateMatrix('RY', [0.7]), c: [0] },
      { t: 1, m: gateMatrix('T'), c: [2] },
    ];
    for (const o of ops) {
      s.apply1(o.t, o.m, o.c);
      r.apply1(o.t, o.m, o.c);
    }
    expect(r.fidelityWithPure(s)).toBeCloseTo(1, 10);
  });

  it('partial trace agrees with the state-vector reduction', () => {
    const s = randomState(3, createRng(3));
    const r = DensityMatrix.fromState(s);
    for (let q = 0; q < 3; q++) {
      const a = r.reduceToQubit(q),
        b = reducedQubit(s, q);
      for (let i = 0; i < 8; i++) expect(a[i]).toBeCloseTo(b[i], 10);
    }
  });

  it('Bell state: global entropy 0, reduced qubit maximally mixed (entropy 1)', () => {
    const r = bell();
    expect(r.entropy()).toBeCloseTo(0, 8);
    const red = r.reduceToQubit(0);
    expect(red[0]).toBeCloseTo(0.5, 12);
    expect(red[6]).toBeCloseTo(0.5, 12);
    expect(Math.hypot(...blochFromRho(red))).toBeCloseTo(0, 12);
  });
});

describe('noise channels', () => {
  it('preserve trace and Hermiticity', () => {
    for (const ch of ['depolarize', 'dephase', 'amplitudeDamp'] as const) {
      const r = DensityMatrix.fromState(randomState(2, createRng(4)));
      r[ch](1, 0.37);
      expect(r.trace()).toBeCloseTo(1, 12);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          expect(r.get(i, j).re).toBeCloseTo(r.get(j, i).re, 12);
          expect(r.get(i, j).im).toBeCloseTo(-r.get(j, i).im, 12);
        }
    }
  });

  it('depolarizing shrinks the Bloch vector by (1−p); p = 1 gives I/2', () => {
    const r = plus().depolarize(0, 0.3);
    expect(blochFromRho(r.reduceToQubit(0))[0]).toBeCloseTo(0.7, 12);
    const full = plus().depolarize(0, 1);
    expect(full.purity()).toBeCloseTo(0.5, 12);
    expect(full.entropy()).toBeCloseTo(1, 8);
  });

  it('dephasing kills x/y but keeps z', () => {
    const r = DensityMatrix.fromState(
      runCircuit({ qubits: 1, columns: [[{ gate: 'RY', targets: [0], params: [1] }]] }).state,
    );
    const z0 = blochFromRho(r.reduceToQubit(0))[2];
    r.dephase(0, 1);
    const b = blochFromRho(r.reduceToQubit(0));
    expect(b[0]).toBeCloseTo(0, 12);
    expect(b[2]).toBeCloseTo(z0, 12);
  });

  it('amplitude damping drives |1⟩ to |0⟩', () => {
    const r = DensityMatrix.fromState(runCircuit({ qubits: 1, columns: [[{ gate: 'X', targets: [0] }]] }).state);
    r.amplitudeDamp(0, 0.25);
    expect(r.probabilities()[1]).toBeCloseTo(0.75, 12);
    r.amplitudeDamp(0, 1);
    expect(r.probabilities()[0]).toBeCloseTo(1, 12);
    expect(r.purity()).toBeCloseTo(1, 12);
  });

  it('depolarizing an entangled pair reduces purity monotonically', () => {
    let last = 1;
    for (const p of [0.1, 0.3, 0.6, 1]) {
      const r = bell().depolarize(0, p).depolarize(1, p);
      expect(r.purity()).toBeLessThan(last + 1e-12);
      last = r.purity();
    }
    expect(last).toBeCloseTo(0.25, 12);
  });

  it('measurement collapses the partner qubit of Φ+', () => {
    const r = bell();
    const a = r.measure(0, 0.9);
    expect(r.reduceToQubit(1)[a === 1 ? 6 : 0]).toBeCloseTo(1, 12);
  });
});
