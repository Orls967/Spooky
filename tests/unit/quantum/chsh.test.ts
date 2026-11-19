import { describe, expect, it } from 'vitest';
import {
  CLASSICAL_BOUND,
  TSIRELSON_S,
  TSIRELSON_WIN,
  chshValue,
  noisyBellPair,
  playRounds,
  quantumWinProbability,
} from '@/lib/quantum/chsh';
import { DensityMatrix } from '@/lib/quantum/density';
import { createRng } from '@/lib/quantum/rng';

describe('CHSH', () => {
  it('Φ+ with optimal angles reaches S = 2√2 (Tsirelson bound)', () => {
    expect(chshValue(noisyBellPair())).toBeCloseTo(TSIRELSON_S, 10);
    expect(TSIRELSON_S).toBeCloseTo(2.828427, 5);
  });

  it('quantum win probability = cos²(π/8) ≈ 85.36%', () => {
    expect(quantumWinProbability(noisyBellPair())).toBeCloseTo(TSIRELSON_WIN, 10);
    expect(TSIRELSON_WIN).toBeCloseTo(0.853553, 5);
  });

  it('product (unentangled) state cannot beat 75%', () => {
    const product = new DensityMatrix(2);
    expect(quantumWinProbability(product)).toBeLessThanOrEqual(CLASSICAL_BOUND + 1e-12);
    expect(Math.abs(chshValue(product))).toBeLessThanOrEqual(2 + 1e-12);
  });

  it('noise reduces S; strong depolarization falls under the classical bound', () => {
    expect(chshValue(noisyBellPair(0.1))).toBeLessThan(TSIRELSON_S);
    expect(chshValue(noisyBellPair(0.5))).toBeLessThan(2);
  });

  it('simulated rounds converge to the theory', () => {
    const q = playRounds(40000, createRng(11), { kind: 'quantum', rho: noisyBellPair() });
    const c = playRounds(40000, createRng(12), { kind: 'classical', strategy: 'always0' });
    const rate = (r: { win: boolean }[]) => r.filter((x) => x.win).length / r.length;
    expect(rate(q)).toBeCloseTo(TSIRELSON_WIN, 1);
    expect(Math.abs(rate(q) - TSIRELSON_WIN)).toBeLessThan(0.01);
    expect(Math.abs(rate(c) - 0.75)).toBeLessThan(0.01);
  });

  it('rounds are replayable from a seed', () => {
    const a = playRounds(50, createRng(5), { kind: 'quantum', rho: noisyBellPair() });
    const b = playRounds(50, createRng(5), { kind: 'quantum', rho: noisyBellPair() });
    expect(a).toEqual(b);
  });
});
