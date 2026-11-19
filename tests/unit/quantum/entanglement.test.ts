import { describe, expect, it } from 'vitest';
import { concurrence, reducedEntropy, thetaPair } from '@/lib/quantum/entanglement';
import { DensityMatrix } from '@/lib/quantum/density';
import { noisyBellPair } from '@/lib/quantum/chsh';
import { runCircuit } from '@/lib/quantum/circuit';
import { bellOps, type BellKind } from '@/lib/quantum/algorithms';
import { hermitianSqrt, cmatMul } from '@/lib/quantum/linalg';
import { randomState } from './helpers';
import { createRng } from '@/lib/quantum/rng';

describe('entanglement measures', () => {
  it('√ρ·√ρ = ρ', () => {
    const r = DensityMatrix.fromState(randomState(2, createRng(4))).depolarize(0, 0.3);
    const s = hermitianSqrt(r.data, 4);
    const back = cmatMul(s, s, 4);
    for (let i = 0; i < 32; i++) expect(back[i]).toBeCloseTo(r.data[i], 9);
  });

  it.each(['phi+', 'phi-', 'psi+', 'psi-'] as BellKind[])('Bell %s has concurrence 1', (k) => {
    const r = DensityMatrix.fromState(runCircuit({ qubits: 2, columns: [bellOps(k)] }).state);
    expect(concurrence(r)).toBeCloseTo(1, 8);
  });

  it('product states have concurrence 0 (pure and mixed)', () => {
    expect(concurrence(new DensityMatrix(2))).toBeCloseTo(0, 8);
    expect(concurrence(DensityMatrix.maximallyMixed(2))).toBeCloseTo(0, 8);
    const prod = DensityMatrix.fromState(
      runCircuit({
        qubits: 2,
        columns: [
          [
            { gate: 'H', targets: [0] },
            { gate: 'RY', targets: [1], params: [0.8] },
          ],
        ],
      }).state,
    );
    expect(concurrence(prod)).toBeCloseTo(0, 8);
  });

  it('pure family: C = sin 2θ, entropy = H(cos²θ)', () => {
    for (const th of [0.1, 0.4, Math.PI / 4, 1.2]) {
      const r = thetaPair(th);
      expect(concurrence(r)).toBeCloseTo(Math.abs(Math.sin(2 * th)), 7);
      const p = Math.cos(th) ** 2;
      const H = -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
      expect(reducedEntropy(r, 0)).toBeCloseTo(H, 8);
    }
  });

  it('locally depolarized Φ+ (Werner): C = max(0, 1 − 3q/2) with q = 1 − (1−p)²', () => {
    for (const p of [0, 0.1, 0.2, 0.3, 0.5]) {
      const q = 1 - (1 - p) ** 2;
      expect(concurrence(noisyBellPair(p))).toBeCloseTo(Math.max(0, 1 - 1.5 * q), 6);
    }
  });
});
