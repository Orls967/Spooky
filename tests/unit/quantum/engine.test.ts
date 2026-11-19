import { describe, expect, it } from 'vitest';
import { sampleShots, simulate } from '@/lib/quantum/engine';
import { stagedToCircuit, teleportation, bellOps } from '@/lib/quantum/algorithms';

describe('engine (worker API)', () => {
  it('simulate returns one snapshot per column + initial, with Bloch vectors', () => {
    const c = { qubits: 2, columns: [[bellOps('phi+')[0]], [bellOps('phi+')[1]]] };
    const r = simulate(c, 1);
    expect(r.snapshots).toHaveLength(3);
    expect(r.snapshots[2].bloch[0].every((v) => Math.abs(v) < 1e-12)).toBe(true);
    expect(r.snapshots[2].probabilities[0]).toBeCloseTo(0.5);
  });

  it('sampleShots of a Bell pair only yields 00 and 11', () => {
    const counts = sampleShots({ qubits: 2, columns: [bellOps('phi+')] }, 2000, 9);
    expect(counts[1] + counts[2]).toBe(0);
    expect(counts[0] + counts[3]).toBe(2000);
  });

  it('circuits with mid-circuit measurement are re-run per shot (teleportation keeps |1⟩ on q2)', () => {
    const counts = sampleShots(stagedToCircuit(teleportation(Math.PI, 0, false)), 300, 4);
    let q2one = 0;
    counts.forEach((v, i) => (q2one += i & 1 ? v : 0));
    expect(q2one).toBe(300);
  });
});
