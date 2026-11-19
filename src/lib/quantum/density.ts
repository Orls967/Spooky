import { C, type Complex } from './complex';
import { mat2, mat2Conj, type Mat2 } from './matrix';
import { gateMatrix } from './gates';
import { StateVector } from './statevector';
import { hermitianEigenvalues } from './linalg';

export const MAX_DENSITY_QUBITS = 4;

/**
 * Density matrix ρ for up to 4 qubits (dim ≤ 16), row-major interleaved complex.
 * Same big-endian qubit ordering as StateVector.
 */
export class DensityMatrix {
  readonly n: number;
  readonly dim: number;
  data: Float64Array;

  constructor(n: number, data?: Float64Array) {
    if (n < 1 || n > MAX_DENSITY_QUBITS) throw new RangeError(`density matrix supports 1…${MAX_DENSITY_QUBITS} qubits`);
    this.n = n;
    this.dim = 1 << n;
    this.data = data ?? new Float64Array(2 * this.dim * this.dim);
    if (!data) this.data[0] = 1;
  }

  static fromState(s: StateVector): DensityMatrix {
    const rho = new DensityMatrix(s.n, new Float64Array(2 * s.dim * s.dim));
    const d = s.data;
    for (let i = 0; i < s.dim; i++)
      for (let j = 0; j < s.dim; j++) {
        // ρ_ij = ψ_i ψ_j*
        const k = 2 * (i * s.dim + j);
        rho.data[k] = d[2 * i] * d[2 * j] + d[2 * i + 1] * d[2 * j + 1];
        rho.data[k + 1] = d[2 * i + 1] * d[2 * j] - d[2 * i] * d[2 * j + 1];
      }
    return rho;
  }

  /** Maximally mixed state I/2^n. */
  static maximallyMixed(n: number): DensityMatrix {
    const rho = new DensityMatrix(n, new Float64Array(2 * (1 << n) * (1 << n)));
    for (let i = 0; i < rho.dim; i++) rho.data[2 * (i * rho.dim + i)] = 1 / rho.dim;
    return rho;
  }

  clone(): DensityMatrix {
    return new DensityMatrix(this.n, this.data.slice());
  }

  get(i: number, j: number): Complex {
    const k = 2 * (i * this.dim + j);
    return C(this.data[k], this.data[k + 1]);
  }

  bit(q: number): number {
    return 1 << (this.n - 1 - q);
  }

  /** Left-multiply: ρ ← (controlled) M ρ, acting on the row index. */
  private leftApply(target: number, m: Mat2, cmask: number): void {
    const d = this.data,
      D = this.dim,
      step = this.bit(target);
    const [m0r, m0i, m1r, m1i, m2r, m2i, m3r, m3i] = m;
    for (let col = 0; col < D; col++)
      for (let i = 0; i < D; i++) {
        if (i & step || (i & cmask) !== cmask) continue;
        const j = i | step;
        const a = 2 * (i * D + col),
          b = 2 * (j * D + col);
        const ar = d[a],
          ai = d[a + 1],
          br = d[b],
          bi = d[b + 1];
        d[a] = m0r * ar - m0i * ai + m1r * br - m1i * bi;
        d[a + 1] = m0r * ai + m0i * ar + m1r * bi + m1i * br;
        d[b] = m2r * ar - m2i * ai + m3r * br - m3i * bi;
        d[b + 1] = m2r * ai + m2i * ar + m3r * bi + m3i * br;
      }
  }

  /** Right-multiply by M†: ρ ← ρ M†, i.e. apply conj(M) to the column index of every row. */
  private rightApplyDagger(target: number, m: Mat2, cmask: number): void {
    const mc = mat2Conj(m);
    const d = this.data,
      D = this.dim,
      step = this.bit(target);
    const [m0r, m0i, m1r, m1i, m2r, m2i, m3r, m3i] = mc;
    for (let row = 0; row < D; row++)
      for (let i = 0; i < D; i++) {
        if (i & step || (i & cmask) !== cmask) continue;
        const j = i | step;
        const a = 2 * (row * D + i),
          b = 2 * (row * D + j);
        const ar = d[a],
          ai = d[a + 1],
          br = d[b],
          bi = d[b + 1];
        d[a] = m0r * ar - m0i * ai + m1r * br - m1i * bi;
        d[a + 1] = m0r * ai + m0i * ar + m1r * bi + m1i * br;
        d[b] = m2r * ar - m2i * ai + m3r * br - m3i * bi;
        d[b + 1] = m2r * ai + m2i * ar + m3r * bi + m3i * br;
      }
  }

  private cmask(controls: readonly number[]): number {
    let m = 0;
    for (const q of controls) m |= this.bit(q);
    return m;
  }

  /** ρ ← U ρ U† for a (controlled) single-qubit unitary. */
  apply1(target: number, m: Mat2, controls: readonly number[] = []): this {
    const cm = this.cmask(controls);
    this.leftApply(target, m, cm);
    this.rightApplyDagger(target, m, cm);
    return this;
  }

  /** ρ ← Σ_k K_k ρ K_k† for single-qubit Kraus operators on `target`. */
  applyKraus1(target: number, kraus: readonly Mat2[]): this {
    const acc = new Float64Array(this.data.length);
    for (const K of kraus) {
      const tmp = this.clone();
      tmp.leftApply(target, K, 0);
      tmp.rightApplyDagger(target, K, 0);
      for (let i = 0; i < acc.length; i++) acc[i] += tmp.data[i];
    }
    this.data = acc;
    return this;
  }

  /** Depolarizing channel: ρ → (1−p)ρ + p·I/2 on one qubit (p ∈ [0,1]). */
  depolarize(target: number, p: number): this {
    const a = Math.sqrt(1 - (3 * p) / 4),
      b = Math.sqrt(p / 4);
    const scale = (m: Mat2, s: number) => m.map((v) => v * s);
    return this.applyKraus1(target, [
      scale(gateMatrix('I'), a),
      scale(gateMatrix('X'), b),
      scale(gateMatrix('Y'), b),
      scale(gateMatrix('Z'), b),
    ]);
  }

  /** Dephasing (phase-flip) channel: off-diagonals shrink by (1−p). */
  dephase(target: number, p: number): this {
    const scale = (m: Mat2, s: number) => m.map((v) => v * s);
    return this.applyKraus1(target, [
      scale(gateMatrix('I'), Math.sqrt(1 - p / 2)),
      scale(gateMatrix('Z'), Math.sqrt(p / 2)),
    ]);
  }

  /** Amplitude damping (energy relaxation |1⟩→|0⟩ with probability γ). */
  amplitudeDamp(target: number, gamma: number): this {
    const K0 = mat2(C(1), C(0), C(0), C(Math.sqrt(1 - gamma)));
    const K1 = mat2(C(0), C(Math.sqrt(gamma)), C(0), C(0));
    return this.applyKraus1(target, [K0, K1]);
  }

  trace(): number {
    let t = 0;
    for (let i = 0; i < this.dim; i++) t += this.data[2 * (i * this.dim + i)];
    return t;
  }

  /** Tr(ρ²) — 1 for pure states, 1/2^n for maximally mixed. */
  purity(): number {
    // Tr(ρ²) = Σ_ij |ρ_ij|² for Hermitian ρ
    let s = 0;
    for (let k = 0; k < this.data.length; k++) s += this.data[k] * this.data[k];
    return s;
  }

  probabilities(): Float64Array {
    const p = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) p[i] = this.data[2 * (i * this.dim + i)];
    return p;
  }

  /** ⟨ψ|ρ|ψ⟩ */
  fidelityWithPure(psi: StateVector): number {
    const D = this.dim,
      p = psi.data,
      d = this.data;
    let re = 0;
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) {
        // conj(ψ_i) ρ_ij ψ_j
        const ar = p[2 * i],
          ai = -p[2 * i + 1];
        const rr = d[2 * (i * D + j)],
          ri = d[2 * (i * D + j) + 1];
        const br = p[2 * j],
          bi = p[2 * j + 1];
        const tr = ar * rr - ai * ri,
          ti = ar * ri + ai * rr;
        re += tr * br - ti * bi;
      }
    return re;
  }

  /** Partial trace keeping a single qubit → 2×2 matrix. */
  reduceToQubit(q: number): Mat2 {
    const D = this.dim,
      b = this.bit(q);
    const out = new Float64Array(8);
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) {
        // keep only pairs that agree on every other qubit
        if ((i & ~b) !== (j & ~b)) continue;
        const r = i & b ? 1 : 0,
          c = j & b ? 1 : 0;
        out[(r * 2 + c) * 2] += this.data[2 * (i * D + j)];
        out[(r * 2 + c) * 2 + 1] += this.data[2 * (i * D + j) + 1];
      }
    return out;
  }

  /** Projective measurement of qubit q (non-selective dephasing is `dephase(q, 1)`). Returns outcome. */
  measure(q: number, r: number): 0 | 1 {
    const b = this.bit(q),
      D = this.dim;
    let p1 = 0;
    for (let i = 0; i < D; i++) if (i & b) p1 += this.data[2 * (i * D + i)];
    const outcome: 0 | 1 = r < p1 ? 1 : 0;
    const keep = outcome === 1 ? p1 : 1 - p1;
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) {
        const k = 2 * (i * D + j);
        const ok = ((i & b) !== 0) === (outcome === 1) && ((j & b) !== 0) === (outcome === 1);
        if (!ok) {
          this.data[k] = 0;
          this.data[k + 1] = 0;
        } else {
          this.data[k] /= keep;
          this.data[k + 1] /= keep;
        }
      }
    return outcome;
  }

  swap(a: number, b: number): this {
    // SWAP = CNOT(a→b) CNOT(b→a) CNOT(a→b)
    const X = gateMatrix('X');
    return this.apply1(b, X, [a]).apply1(a, X, [b]).apply1(b, X, [a]);
  }

  /** Von Neumann entropy S(ρ) = −Tr ρ log₂ ρ. */
  entropy(): number {
    return entropyOfEigenvalues(hermitianEigenvalues(this.data, this.dim));
  }
}

export function entropyOfEigenvalues(ev: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < ev.length; i++) {
    const l = ev[i];
    if (l > 1e-12) s -= l * Math.log2(l);
  }
  return s;
}
