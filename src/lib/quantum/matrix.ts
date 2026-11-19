import { C, type Complex } from './complex';

/**
 * 2×2 complex matrix, row-major, interleaved:
 * [m00re, m00im, m01re, m01im, m10re, m10im, m11re, m11im]
 */
export type Mat2 = Float64Array;

export function mat2(m00: Complex, m01: Complex, m10: Complex, m11: Complex): Mat2 {
  return Float64Array.of(m00.re, m00.im, m01.re, m01.im, m10.re, m10.im, m11.re, m11.im);
}

export function mat2Get(m: Mat2, r: 0 | 1, c: 0 | 1): Complex {
  const k = (r * 2 + c) * 2;
  return C(m[k], m[k + 1]);
}

export function mat2Mul(a: Mat2, b: Mat2): Mat2 {
  const out = new Float64Array(8);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 2; c++) {
      let re = 0;
      let im = 0;
      for (let k = 0; k < 2; k++) {
        const ar = a[(r * 2 + k) * 2],
          ai = a[(r * 2 + k) * 2 + 1];
        const br = b[(k * 2 + c) * 2],
          bi = b[(k * 2 + c) * 2 + 1];
        re += ar * br - ai * bi;
        im += ar * bi + ai * br;
      }
      out[(r * 2 + c) * 2] = re;
      out[(r * 2 + c) * 2 + 1] = im;
    }
  return out;
}

/** Conjugate transpose. */
export function mat2Dagger(m: Mat2): Mat2 {
  return Float64Array.of(m[0], -m[1], m[4], -m[5], m[2], -m[3], m[6], -m[7]);
}

/** Element-wise complex conjugate (no transpose). */
export function mat2Conj(m: Mat2): Mat2 {
  return Float64Array.of(m[0], -m[1], m[2], -m[3], m[4], -m[5], m[6], -m[7]);
}

export function mat2Scale(m: Mat2, s: number): Mat2 {
  return m.map((v) => v * s);
}

export function mat2ApproxEq(a: Mat2, b: Mat2, eps = 1e-9): boolean {
  for (let i = 0; i < 8; i++) if (Math.abs(a[i] - b[i]) > eps) return false;
  return true;
}

/** Equal up to a global phase e^{iα}. */
export function mat2EqUpToPhase(a: Mat2, b: Mat2, eps = 1e-9): boolean {
  // find the largest entry of b to estimate the phase
  let k = 0;
  let best = -1;
  for (let i = 0; i < 4; i++) {
    const v = b[2 * i] ** 2 + b[2 * i + 1] ** 2;
    if (v > best) {
      best = v;
      k = i;
    }
  }
  if (best < eps) return mat2ApproxEq(a, b, eps);
  // phase = a_k / b_k
  const ar = a[2 * k],
    ai = a[2 * k + 1],
    br = b[2 * k],
    bi = b[2 * k + 1];
  const d = br * br + bi * bi;
  const pr = (ar * br + ai * bi) / d;
  const pi = (ai * br - ar * bi) / d;
  for (let i = 0; i < 4; i++) {
    const re = b[2 * i] * pr - b[2 * i + 1] * pi;
    const im = b[2 * i] * pi + b[2 * i + 1] * pr;
    if (Math.abs(re - a[2 * i]) > eps || Math.abs(im - a[2 * i + 1]) > eps) return false;
  }
  return true;
}
