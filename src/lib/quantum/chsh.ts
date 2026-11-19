import { gateMatrix } from './gates';
import { DensityMatrix } from './density';
import { StateVector } from './statevector';
import { bellOps } from './algorithms';
import { runCircuit } from './circuit';
import { makeSampler } from './sampling';
import type { Rng } from './rng';

/**
 * CHSH game. Referee sends random bits x (to Alice) and y (to Bob); they answer a, b without talking.
 * They win iff a ⊕ b = x ∧ y. Best classical strategy: 75%. Quantum (shared Φ+): cos²(π/8) ≈ 85.36%.
 *
 * A measurement "at angle θ" measures the observable cos θ·Z + sin θ·X (a direction in the x–z plane of the
 * Bloch sphere): we rotate by Ry(−θ) and then measure in the computational basis.
 */
export const CLASSICAL_BOUND = 0.75;
export const TSIRELSON_WIN = Math.cos(Math.PI / 8) ** 2;
export const TSIRELSON_S = 2 * Math.SQRT2;

export interface QuantumStrategy {
  a0: number;
  a1: number;
  b0: number;
  b1: number;
}

export const OPTIMAL_STRATEGY: QuantumStrategy = { a0: 0, a1: Math.PI / 2, b0: Math.PI / 4, b1: -Math.PI / 4 };

/** Joint outcome distribution [P00, P01, P10, P11] (index = 2a + b) for a 2-qubit density matrix. */
export function jointDistribution(rho: DensityMatrix, thetaA: number, thetaB: number): Float64Array {
  const r = rho.clone();
  r.apply1(0, gateMatrix('RY', [-thetaA]));
  r.apply1(1, gateMatrix('RY', [-thetaB]));
  return r.probabilities();
}

/** Correlator E = P(a=b) − P(a≠b). */
export function correlator(rho: DensityMatrix, thetaA: number, thetaB: number): number {
  const p = jointDistribution(rho, thetaA, thetaB);
  return p[0] + p[3] - p[1] - p[2];
}

/** S = E(a0,b0) + E(a0,b1) + E(a1,b0) − E(a1,b1). |S| ≤ 2 classically, ≤ 2√2 quantum. */
export function chshValue(rho: DensityMatrix, s: QuantumStrategy = OPTIMAL_STRATEGY): number {
  return (
    correlator(rho, s.a0, s.b0) +
    correlator(rho, s.a0, s.b1) +
    correlator(rho, s.a1, s.b0) -
    correlator(rho, s.a1, s.b1)
  );
}

/** Exact winning probability of a quantum strategy on state ρ (uniform x, y). */
export function quantumWinProbability(rho: DensityMatrix, s: QuantumStrategy = OPTIMAL_STRATEGY): number {
  let win = 0;
  for (const x of [0, 1])
    for (const y of [0, 1]) {
      const p = jointDistribution(rho, x ? s.a1 : s.a0, y ? s.b1 : s.b0);
      const same = p[0] + p[3];
      win += 0.25 * (x & y ? 1 - same : same);
    }
  return win;
}

/** Shared Φ+ pair, optionally passed through a depolarizing channel of strength p on both qubits. */
export function noisyBellPair(p = 0): DensityMatrix {
  const sv = runCircuit({ qubits: 2, columns: [bellOps('phi+')] }).state;
  const rho = DensityMatrix.fromState(sv);
  if (p > 0) rho.depolarize(0, p).depolarize(1, p);
  return rho;
}

export type ClassicalStrategy = 'always0' | 'copy' | 'random';

export interface Round {
  x: 0 | 1;
  y: 0 | 1;
  a: 0 | 1;
  b: 0 | 1;
  win: boolean;
}

/** Simulate rounds of the CHSH game. Quantum rounds sample from the Born-rule joint distribution. */
export function playRounds(
  count: number,
  rng: Rng,
  player:
    | { kind: 'quantum'; rho: DensityMatrix; strategy?: QuantumStrategy }
    | { kind: 'classical'; strategy: ClassicalStrategy },
): Round[] {
  const rounds: Round[] = [];
  let samplers: ((r: number) => number)[] | null = null;
  if (player.kind === 'quantum') {
    const s = player.strategy ?? OPTIMAL_STRATEGY;
    samplers = [0, 1, 2, 3].map((xy) => {
      const x = xy >> 1,
        y = xy & 1;
      return makeSampler(jointDistribution(player.rho, x ? s.a1 : s.a0, y ? s.b1 : s.b0));
    });
  }
  for (let i = 0; i < count; i++) {
    const x = (rng() < 0.5 ? 0 : 1) as 0 | 1;
    const y = (rng() < 0.5 ? 0 : 1) as 0 | 1;
    let a: 0 | 1, b: 0 | 1;
    if (samplers) {
      const k = samplers[2 * x + y](rng());
      a = (k >> 1) as 0 | 1;
      b = (k & 1) as 0 | 1;
    } else if (player.kind === 'classical' && player.strategy === 'copy') {
      a = x;
      b = 0;
    } else if (player.kind === 'classical' && player.strategy === 'random') {
      a = (rng() < 0.5 ? 0 : 1) as 0 | 1;
      b = (rng() < 0.5 ? 0 : 1) as 0 | 1;
    } else {
      a = 0;
      b = 0;
    }
    rounds.push({ x, y, a, b, win: (a ^ b) === (x & y) });
  }
  return rounds;
}

/** Entanglement entropy of |ψ(θ)⟩ = cos θ|00⟩ + sin θ|11⟩ (closed form, bits). */
export function entanglementEntropyOfPure2(sv: StateVector): number {
  // Schmidt coefficients from the 2×2 coefficient matrix M (ψ = Σ M_ab |ab⟩): eigenvalues of M M†
  const d = sv.data;
  const m = [0, 1, 2, 3].map((i) => ({ re: d[2 * i], im: d[2 * i + 1] }));
  // det(M) = m00 m11 − m01 m10 ; λ± = (1 ± √(1 − 4|det|²))/2
  const detRe = m[0].re * m[3].re - m[0].im * m[3].im - (m[1].re * m[2].re - m[1].im * m[2].im);
  const detIm = m[0].re * m[3].im + m[0].im * m[3].re - (m[1].re * m[2].im + m[1].im * m[2].re);
  const c2 = 4 * (detRe * detRe + detIm * detIm); // concurrence²
  const disc = Math.sqrt(Math.max(0, 1 - c2));
  const l1 = (1 + disc) / 2,
    l2 = (1 - disc) / 2;
  const h = (p: number) => (p > 1e-12 ? -p * Math.log2(p) : 0);
  return h(l1) + h(l2);
}

/** Concurrence of a pure 2-qubit state: 2|ad − bc|. */
export function concurrencePure2(sv: StateVector): number {
  const d = sv.data;
  const re = d[0] * d[6] - d[1] * d[7] - (d[2] * d[4] - d[3] * d[5]);
  const im = d[0] * d[7] + d[1] * d[6] - (d[2] * d[5] + d[3] * d[4]);
  return 2 * Math.hypot(re, im);
}
