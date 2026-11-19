import { C, type Complex } from './complex';
import type { Mat2 } from './matrix';

export const MAX_QUBITS = 10;

/**
 * Pure state of n qubits as an interleaved complex Float64Array (re, im, re, im, …).
 *
 * Ordering convention (big-endian, as in most textbooks): qubit 0 is the LEFT-most symbol of the ket
 * and the MOST significant bit of the basis index. |q0 q1 … q(n−1)⟩ ↔ index Σ q_k·2^(n−1−k).
 */
export class StateVector {
  readonly n: number;
  readonly dim: number;
  data: Float64Array;

  constructor(n: number, data?: Float64Array) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) throw new RangeError(`qubits must be 1…${MAX_QUBITS}`);
    this.n = n;
    this.dim = 1 << n;
    if (data) {
      if (data.length !== 2 * this.dim) throw new RangeError('state length mismatch');
      this.data = data;
    } else {
      this.data = new Float64Array(2 * this.dim);
      this.data[0] = 1;
    }
  }

  static zero(n: number): StateVector {
    return new StateVector(n);
  }

  /** Computational basis state |index⟩. */
  static basis(n: number, index: number): StateVector {
    const s = new StateVector(n);
    s.data[0] = 0;
    s.data[2 * index] = 1;
    return s;
  }

  /** Build from complex amplitudes (normalised automatically). */
  static fromAmplitudes(amps: readonly Complex[]): StateVector {
    const n = Math.log2(amps.length);
    if (!Number.isInteger(n)) throw new RangeError('length must be a power of two');
    const s = new StateVector(n, new Float64Array(2 * amps.length));
    amps.forEach((a, i) => {
      s.data[2 * i] = a.re;
      s.data[2 * i + 1] = a.im;
    });
    s.normalize();
    return s;
  }

  clone(): StateVector {
    return new StateVector(this.n, this.data.slice());
  }

  /** Bit mask of qubit q inside a basis index. */
  bit(q: number): number {
    return 1 << (this.n - 1 - q);
  }

  maskOf(qubits: readonly number[]): number {
    let m = 0;
    for (const q of qubits) m |= this.bit(q);
    return m;
  }

  amplitude(i: number): Complex {
    return C(this.data[2 * i], this.data[2 * i + 1]);
  }

  norm2(): number {
    let s = 0;
    for (let i = 0; i < this.data.length; i++) s += this.data[i] * this.data[i];
    return s;
  }

  normalize(): this {
    const n = Math.sqrt(this.norm2());
    if (n === 0) throw new Error('cannot normalise the zero vector');
    for (let i = 0; i < this.data.length; i++) this.data[i] /= n;
    return this;
  }

  /**
   * Apply a 2×2 unitary to `target`, optionally conditioned on all `controls` being |1⟩.
   * Works by strides over amplitude pairs — never builds the 2^n × 2^n matrix.
   */
  apply1(target: number, m: Mat2, controls: readonly number[] = []): this {
    const d = this.data;
    const step = this.bit(target);
    const cmask = this.maskOf(controls);
    const [m0r, m0i, m1r, m1i, m2r, m2i, m3r, m3i] = m;
    for (let base = 0; base < this.dim; base += step << 1) {
      for (let i = base; i < base + step; i++) {
        if ((i & cmask) !== cmask) continue;
        const j = i | step;
        const ar = d[2 * i],
          ai = d[2 * i + 1],
          br = d[2 * j],
          bi = d[2 * j + 1];
        d[2 * i] = m0r * ar - m0i * ai + m1r * br - m1i * bi;
        d[2 * i + 1] = m0r * ai + m0i * ar + m1r * bi + m1i * br;
        d[2 * j] = m2r * ar - m2i * ai + m3r * br - m3i * bi;
        d[2 * j + 1] = m2r * ai + m2i * ar + m3r * bi + m3i * br;
      }
    }
    return this;
  }

  /** SWAP qubits a and b (optionally controlled → Fredkin). */
  swap(a: number, b: number, controls: readonly number[] = []): this {
    if (a === b) return this;
    const d = this.data;
    const ba = this.bit(a),
      bb = this.bit(b);
    const cmask = this.maskOf(controls);
    for (let i = 0; i < this.dim; i++) {
      // visit each pair once: a=1, b=0 ↔ a=0, b=1
      if ((i & ba) === 0 || (i & bb) !== 0) continue;
      if ((i & cmask) !== cmask) continue;
      const j = (i & ~ba) | bb;
      const tr = d[2 * i],
        ti = d[2 * i + 1];
      d[2 * i] = d[2 * j];
      d[2 * i + 1] = d[2 * j + 1];
      d[2 * j] = tr;
      d[2 * j + 1] = ti;
    }
    return this;
  }

  probabilities(): Float64Array {
    const p = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) p[i] = this.data[2 * i] ** 2 + this.data[2 * i + 1] ** 2;
    return p;
  }

  /** P(qubit q = 1). */
  probOne(q: number): number {
    const b = this.bit(q);
    let s = 0;
    for (let i = 0; i < this.dim; i++) if (i & b) s += this.data[2 * i] ** 2 + this.data[2 * i + 1] ** 2;
    return s;
  }

  /**
   * Projective Z-measurement of qubit q. Collapses the state and returns the outcome.
   * `r` is a uniform random number in [0,1) (supplied by a seeded RNG for replayability).
   */
  measure(q: number, r: number): 0 | 1 {
    const p1 = this.probOne(q);
    const outcome: 0 | 1 = r < p1 ? 1 : 0;
    this.collapse(q, outcome);
    return outcome;
  }

  /** Project qubit q onto |outcome⟩ and renormalise. */
  collapse(q: number, outcome: 0 | 1): this {
    const b = this.bit(q);
    for (let i = 0; i < this.dim; i++) {
      const isOne = (i & b) !== 0;
      if (isOne !== (outcome === 1)) {
        this.data[2 * i] = 0;
        this.data[2 * i + 1] = 0;
      }
    }
    return this.normalize();
  }

  /** ⟨other|this⟩ */
  inner(other: StateVector): Complex {
    let re = 0,
      im = 0;
    const a = other.data,
      b = this.data;
    for (let i = 0; i < this.dim; i++) {
      const ar = a[2 * i],
        ai = -a[2 * i + 1];
      re += ar * b[2 * i] - ai * b[2 * i + 1];
      im += ar * b[2 * i + 1] + ai * b[2 * i];
    }
    return C(re, im);
  }

  /** |⟨other|this⟩|² — insensitive to global phase. */
  fidelity(other: StateVector): number {
    const z = this.inner(other);
    return z.re * z.re + z.im * z.im;
  }

  /** Ket label of basis index i, e.g. "010". */
  label(i: number): string {
    return i.toString(2).padStart(this.n, '0');
  }
}

/** Basis label for index i in an n-qubit register (big-endian). */
export function basisLabel(i: number, n: number): string {
  return i.toString(2).padStart(n, '0');
}

/** Hamming weight (number of 1s). */
export function hammingWeight(i: number): number {
  let c = 0;
  while (i) {
    i &= i - 1;
    c++;
  }
  return c;
}
