/** Minimal complex arithmetic. Hot paths operate on interleaved Float64Arrays instead. */
export interface Complex {
  re: number;
  im: number;
}

export const C = (re: number, im = 0): Complex => ({ re, im });
export const ZERO: Complex = C(0, 0);
export const ONE: Complex = C(1, 0);

export const add = (a: Complex, b: Complex): Complex => C(a.re + b.re, a.im + b.im);
export const sub = (a: Complex, b: Complex): Complex => C(a.re - b.re, a.im - b.im);
export const mul = (a: Complex, b: Complex): Complex => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const scale = (a: Complex, s: number): Complex => C(a.re * s, a.im * s);
export const conj = (a: Complex): Complex => C(a.re, -a.im);
export const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const abs = (a: Complex): number => Math.hypot(a.re, a.im);
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);
/** e^{iθ} */
export const expi = (theta: number): Complex => C(Math.cos(theta), Math.sin(theta));

export function approxEq(a: Complex, b: Complex, eps = 1e-9): boolean {
  return Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps;
}
