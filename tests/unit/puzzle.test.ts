import { describe, expect, it } from 'vitest';
import { PUZZLES } from '@/content/puzzles';
import { evaluate, opKey, targetState } from '@/lib/puzzle';
import { packOps, type Circuit } from '@/lib/quantum/circuit';
import { g } from '@/lib/quantum/algorithms';
import { isUnlocked } from '@/store/progress';

describe('puzzle levels', () => {
  it('there are at least 20 levels with sequential ids', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(20);
    PUZZLES.forEach((p, i) => expect(p.id).toBe(i + 1));
  });

  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    'level %i: reference solution earns 3 stars using only allowed gates',
    (_id, p) => {
      const c = packOps(p.qubits, p.solution);
      const e = evaluate(p, c);
      expect(e.illegal).toEqual([]);
      expect(e.fidelity).toBeGreaterThan(0.999999);
      expect(e.solved).toBe(true);
      expect(e.gates).toBe(p.par);
      expect(e.depth).toBe(p.parDepth);
      expect(e.stars).toBe(3);
    },
  );

  it.each(PUZZLES.map((p) => [p.id, p] as const))('level %i: the empty circuit does not solve it', (_id, p) => {
    const e = evaluate(p, { qubits: p.qubits, columns: [] });
    expect(e.solved).toBe(false);
    expect(e.stars).toBe(0);
  });

  it('a correct state with a forbidden gate is rejected', () => {
    const p = PUZZLES.find((x) => x.allowed.join() === 'H,Z' && x.qubits === 1)!; // "NOT without X"
    const e = evaluate(p, packOps(1, [g.x(0)]));
    expect(e.fidelity).toBeCloseTo(1);
    expect(e.solved).toBe(false);
    expect(e.illegal).toEqual(['X']);
  });

  it('global phase is ignored, longer solutions get fewer stars', () => {
    const p = PUZZLES[0]; // |1⟩ with X
    const c: Circuit = packOps(1, [g.x(0), g.x(0), g.x(0)]);
    const e = evaluate(p, c);
    expect(e.solved).toBe(true);
    expect(e.stars).toBe(2);
    const five = evaluate(p, packOps(1, [g.x(0), g.x(0), g.x(0), g.x(0), g.x(0)]));
    expect(five.stars).toBe(1);
  });

  it('fidelity threshold is 0.999', () => {
    const p = PUZZLES.find((x) => x.allowed.join() === 'RY')!;
    const near = evaluate(p, packOps(1, [g.ry(0, (3 * Math.PI) / 4 + 0.05)]));
    expect(near.fidelity).toBeGreaterThan(0.999);
    expect(near.solved).toBe(true);
    const off = evaluate(p, packOps(1, [g.ry(0, Math.PI / 2)]));
    expect(off.solved).toBe(false);
  });

  it('opKey maps controlled gates', () => {
    expect(opKey(g.cx(0, 1))).toBe('CX');
    expect(opKey(g.cz(0, 1))).toBe('CZ');
    expect(opKey(g.ccx(0, 1, 2))).toBe('CCX');
    expect(opKey({ gate: 'RY', targets: [1], controls: [0], params: [1] })).toBe('CU');
    expect(opKey(g.h(0))).toBe('H');
  });

  it('targets are normalised states', () => {
    for (const p of PUZZLES) expect(targetState(p).norm2()).toBeCloseTo(1, 12);
  });

  it('levels unlock sequentially', () => {
    expect(isUnlocked({}, 1)).toBe(true);
    expect(isUnlocked({}, 2)).toBe(false);
    expect(isUnlocked({ 1: 1 }, 2)).toBe(true);
  });
});
