import { describe, expect, it } from 'vitest';
import { runCircuit } from '@/lib/quantum/circuit';
import {
  bernsteinVazirani,
  cMulMod15,
  deutschJozsa,
  factorsFromPeriod,
  grover,
  groverIterations,
  groverTheory,
  periodFromMeasurement,
  qftOps,
  iqftOps,
  shor15,
  stagedToCircuit,
  superdense,
  teleportation,
  g,
} from '@/lib/quantum/algorithms';
import { StateVector } from '@/lib/quantum/statevector';
import { createRng } from '@/lib/quantum/rng';
import { blochOfQubit, stateFromAngles } from '@/lib/quantum/bloch';
import { packOps } from '@/lib/quantum/circuit';

describe('teleportation', () => {
  const cases = [
    [0, 0],
    [Math.PI, 0],
    [Math.PI / 2, 0],
    [Math.PI / 2, Math.PI / 2],
    [1.234, -2.2],
    [2.9, 0.4],
  ];

  it.each(cases)('deferred-measurement version transfers θ=%f φ=%f with fidelity 1', (theta, phi) => {
    const s = runCircuit(stagedToCircuit(teleportation(theta, phi, true))).state;
    const msg = blochOfQubit(stateFromAngles(theta, phi), 0);
    const out = blochOfQubit(s, 2);
    // fidelity between pure qubit states = (1 + r·r')/2
    const fid = (1 + msg[0] * out[0] + msg[1] * out[1] + msg[2] * out[2]) / 2;
    expect(fid).toBeCloseTo(1, 10);
  });

  it.each(cases)('measured version (all random outcomes) θ=%f φ=%f has fidelity 1', (theta, phi) => {
    for (let seed = 1; seed <= 16; seed++) {
      const rs = runCircuit(stagedToCircuit(teleportation(theta, phi, false)), createRng(seed));
      const msg = blochOfQubit(stateFromAngles(theta, phi), 0);
      const out = blochOfQubit(rs.state, 2);
      const fid = (1 + msg[0] * out[0] + msg[1] * out[1] + msg[2] * out[2]) / 2;
      expect(fid).toBeCloseTo(1, 10);
      expect(rs.classical[0]).toBeGreaterThanOrEqual(0);
      expect(rs.classical[1]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Grover', () => {
  for (const n of [2, 3, 4, 5, 6]) {
    it(`n=${n} reaches the theoretical success probability for every marked item`, () => {
      const k = groverIterations(n);
      const theory = groverTheory(n, k);
      for (let marked = 0; marked < 2 ** n; marked += n > 4 ? 7 : 1) {
        const s = runCircuit(stagedToCircuit(grover(n, marked))).state;
        expect(s.probabilities()[marked]).toBeCloseTo(theory, 10);
      }
    });
  }
  it('n=2 finds the item with certainty after one iteration', () => {
    expect(groverTheory(2, 1)).toBeCloseTo(1, 12);
    const s = runCircuit(stagedToCircuit(grover(2, 2))).state;
    expect(s.probabilities()[2]).toBeCloseTo(1, 12);
  });
  it('amplitude follows sin²((2k+1)θ) iteration by iteration', () => {
    for (let k = 0; k <= 5; k++) {
      const s = runCircuit(stagedToCircuit(grover(4, 11, k))).state;
      expect(s.probabilities()[11]).toBeCloseTo(groverTheory(4, k), 10);
    }
  });
});

describe('QFT', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    it(`n=${n} equals the discrete Fourier transform on every basis state`, () => {
      const N = 2 ** n;
      const circ = packOps(n, qftOps(n));
      for (let x = 0; x < N; x++) {
        const s = runCircuit(circ, undefined, StateVector.basis(n, x)).state;
        for (let y = 0; y < N; y++) {
          const a = s.amplitude(y);
          const ang = (2 * Math.PI * x * y) / N;
          expect(a.re).toBeCloseTo(Math.cos(ang) / Math.sqrt(N), 10);
          expect(a.im).toBeCloseTo(Math.sin(ang) / Math.sqrt(N), 10);
        }
      }
    });
  }
  it('inverse QFT undoes QFT', () => {
    const n = 4;
    const circ = packOps(n, [...qftOps(n), ...iqftOps(n)]);
    for (let x = 0; x < 16; x++) {
      const s = runCircuit(circ, undefined, StateVector.basis(n, x)).state;
      expect(s.probabilities()[x]).toBeCloseTo(1, 10);
    }
  });
});

describe('Deutsch–Jozsa & Bernstein–Vazirani', () => {
  const inputProb0 = (_n: number, s: StateVector) => {
    // probability that all n input qubits are 0 (ancilla is the last qubit)
    const p = s.probabilities();
    return p[0] + p[1];
  };
  it('constant oracles give |0…0⟩ with certainty', () => {
    for (const value of [0, 1] as const) {
      const c = stagedToCircuit(deutschJozsa(3, { kind: 'constant', value }), 4); // before measurement
      expect(inputProb0(3, runCircuit(c).state)).toBeCloseTo(1, 12);
    }
  });
  it('balanced oracles never give |0…0⟩', () => {
    for (let mask = 1; mask < 8; mask++) {
      const c = stagedToCircuit(deutschJozsa(3, { kind: 'balanced', mask }), 4);
      expect(inputProb0(3, runCircuit(c).state)).toBeCloseTo(0, 12);
    }
  });
  it('Bernstein–Vazirani reveals the secret string in one query', () => {
    for (let secret = 0; secret < 16; secret++) {
      const rs = runCircuit(stagedToCircuit(bernsteinVazirani(4, secret)), createRng(secret + 1));
      const read = [0, 1, 2, 3].reduce((acc, q) => (acc << 1) | rs.classical[q], 0);
      expect(read).toBe(secret);
    }
  });
});

describe('superdense coding', () => {
  it.each([
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ] as const)('sends bits %i%i', (b0, b1) => {
    const rs = runCircuit(stagedToCircuit(superdense(b0, b1)), createRng(5));
    expect([rs.classical[0], rs.classical[1]]).toEqual([b0, b1]);
  });
});

describe('Shor for N = 15', () => {
  it('controlled ×a mod 15 permutes the work register correctly', () => {
    for (const a of [2, 4, 7, 8, 11, 13]) {
      for (let w = 1; w < 15; w++) {
        // qubits: 0 = control, 1…4 = work (bit k on qubit 4−k)
        const prep = [g.x(0), ...[0, 1, 2, 3].filter((k) => w & (1 << k)).map((k) => g.x(4 - k))];
        const s = runCircuit(packOps(5, [...prep, ...cMulMod15(a, 0, 1)])).state;
        const idx = s.probabilities().findIndex((p) => p > 0.5);
        const out = idx & 0b1111;
        expect(out).toBe((a * w) % 15);
      }
    }
  });

  it('a = 7: counting register peaks at 0, 4, 8, 12 (period 4) and factors 15 = 3 × 5', () => {
    const c = stagedToCircuit(shor15(7), 4); // before measurement
    const p = runCircuit(c).state.probabilities();
    const counting = new Float64Array(16);
    p.forEach((v, i) => (counting[i >> 4] += v));
    for (let y = 0; y < 16; y++) expect(counting[y]).toBeCloseTo(y % 4 === 0 ? 0.25 : 0, 10);
    const r = periodFromMeasurement(4, 16, 7, 15);
    expect(r).toBe(4);
    expect(factorsFromPeriod(7, 4, 15)).toEqual([3, 5]);
  });

  it('a = 4 (period 2) peaks at 0 and 8', () => {
    const p = runCircuit(stagedToCircuit(shor15(4), 4)).state.probabilities();
    const counting = new Float64Array(16);
    p.forEach((v, i) => (counting[i >> 4] += v));
    expect(counting[0]).toBeCloseTo(0.5, 10);
    expect(counting[8]).toBeCloseTo(0.5, 10);
  });
});
