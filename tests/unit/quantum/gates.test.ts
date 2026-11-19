import { describe, expect, it } from 'vitest';
import { GATES, SINGLE_QUBIT_GATES, gateMatrix, inverseGate, type SingleGateId } from '@/lib/quantum/gates';
import { mat2ApproxEq, mat2Dagger, mat2EqUpToPhase, mat2Mul } from '@/lib/quantum/matrix';
import { StateVector } from '@/lib/quantum/statevector';
import { blochOfQubit, gateRotation, rotateVec } from '@/lib/quantum/bloch';
import { applyOp, type Op } from '@/lib/quantum/circuit';
import { createRng } from '@/lib/quantum/rng';
import { randomState, rng0 } from './helpers';

const params = (id: SingleGateId) => [0.7, -1.3, 2.1].slice(0, GATES[id].params);
const I = gateMatrix('I');

describe('gate matrices', () => {
  it.each(SINGLE_QUBIT_GATES)('%s is unitary', (id) => {
    const m = gateMatrix(id, params(id));
    expect(mat2ApproxEq(mat2Mul(m, mat2Dagger(m)), I)).toBe(true);
  });

  it('H·H = I', () => {
    const H = gateMatrix('H');
    expect(mat2ApproxEq(mat2Mul(H, H), I)).toBe(true);
  });

  it('S² = Z, T² = S, SX² = X, HZH = X', () => {
    expect(mat2ApproxEq(mat2Mul(gateMatrix('S'), gateMatrix('S')), gateMatrix('Z'))).toBe(true);
    expect(mat2ApproxEq(mat2Mul(gateMatrix('T'), gateMatrix('T')), gateMatrix('S'))).toBe(true);
    expect(mat2ApproxEq(mat2Mul(gateMatrix('SX'), gateMatrix('SX')), gateMatrix('X'))).toBe(true);
    const H = gateMatrix('H');
    expect(mat2ApproxEq(mat2Mul(mat2Mul(H, gateMatrix('Z')), H), gateMatrix('X'))).toBe(true);
  });

  it('rotations at π equal Paulis up to global phase', () => {
    expect(mat2EqUpToPhase(gateMatrix('RX', [Math.PI]), gateMatrix('X'))).toBe(true);
    expect(mat2EqUpToPhase(gateMatrix('RY', [Math.PI]), gateMatrix('Y'))).toBe(true);
    expect(mat2EqUpToPhase(gateMatrix('RZ', [Math.PI]), gateMatrix('Z'))).toBe(true);
    expect(mat2EqUpToPhase(gateMatrix('P', [Math.PI / 2]), gateMatrix('S'))).toBe(true);
    expect(mat2EqUpToPhase(gateMatrix('U3', [Math.PI / 2, 0, Math.PI]), gateMatrix('H'))).toBe(true);
  });

  it.each(SINGLE_QUBIT_GATES)('inverse of %s cancels it (up to global phase)', (id) => {
    const m = gateMatrix(id, params(id));
    const inv = inverseGate(id, params(id));
    expect(mat2EqUpToPhase(mat2Mul(gateMatrix(inv.gate, inv.params), m), I)).toBe(true);
  });
});

describe('norm is preserved by every gate', () => {
  const rng = rng0();
  const ops: Op[] = [
    ...SINGLE_QUBIT_GATES.map((id): Op => ({ gate: id, targets: [1], params: params(id) })),
    ...SINGLE_QUBIT_GATES.map((id): Op => ({ gate: id, targets: [2], controls: [0], params: params(id) })),
    { gate: 'X', targets: [3], controls: [0, 1] },
    { gate: 'Z', targets: [0], controls: [1, 2, 3] },
    { gate: 'SWAP', targets: [0, 3] },
    { gate: 'SWAP', targets: [1, 2], controls: [0] },
  ];
  it.each(ops.map((o) => [`${o.gate}${o.controls ? ` c${o.controls.join(',')}` : ''} t${o.targets.join(',')}`, o]))(
    '%s',
    (_name, op) => {
      const rs = { state: randomState(4, rng), classical: new Int8Array(4).fill(-1) };
      applyOp(rs, op as Op);
      expect(rs.state.norm2()).toBeCloseTo(1, 12);
    },
  );

  it('norm stays 1 across a long random circuit of 10 qubits', () => {
    const r = createRng(7);
    const s = StateVector.zero(10);
    const rs = { state: s, classical: new Int8Array(10).fill(-1) };
    for (let k = 0; k < 400; k++) {
      const id = SINGLE_QUBIT_GATES[Math.floor(r() * SINGLE_QUBIT_GATES.length)];
      const t = Math.floor(r() * 10);
      const c = (t + 1 + Math.floor(r() * 9)) % 10;
      applyOp(rs, {
        gate: id,
        targets: [t],
        controls: r() < 0.4 ? [c] : undefined,
        params: [r() * 6, r() * 6, r() * 6],
      });
      expect(rs.state.norm2()).toBeCloseTo(1, 10);
    }
  });
});

describe('Bloch rotation of a gate', () => {
  it('H rotates by π about (x+z)/√2', () => {
    const { axis, angle } = gateRotation(gateMatrix('H'));
    expect(angle).toBeCloseTo(Math.PI, 10);
    expect(axis[0]).toBeCloseTo(Math.SQRT1_2, 10);
    expect(axis[1]).toBeCloseTo(0, 10);
    expect(axis[2]).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it('S rotates by π/2 about +z; Rx(θ) about +x by θ', () => {
    const s = gateRotation(gateMatrix('S'));
    expect(s.angle).toBeCloseTo(Math.PI / 2, 10);
    expect(s.axis[2]).toBeCloseTo(1, 10);
    const rx = gateRotation(gateMatrix('RX', [1.1]));
    expect(rx.angle).toBeCloseTo(1.1, 10);
    expect(rx.axis[0]).toBeCloseTo(1, 10);
  });

  it.each(SINGLE_QUBIT_GATES)('rotating the Bloch vector reproduces %s|ψ⟩', (id) => {
    const rng = createRng(99);
    for (let k = 0; k < 5; k++) {
      const s = randomState(1, rng);
      const before = blochOfQubit(s, 0);
      const m = gateMatrix(id, params(id));
      const after = blochOfQubit(s.clone().apply1(0, m), 0);
      const { axis, angle } = gateRotation(m);
      const rotated = rotateVec(before, axis, angle);
      for (let i = 0; i < 3; i++) expect(rotated[i]).toBeCloseTo(after[i], 9);
    }
  });
});
