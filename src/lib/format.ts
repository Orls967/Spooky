/** Number formatting for amplitudes and probabilities (uses a true minus sign). */
export function fmt(x: number, digits = 3): string {
  const v = Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x;
  const s = v.toFixed(digits);
  return s.startsWith('-') ? `−${s.slice(1)}` : s;
}

export function fmtComplex(re: number, im: number, digits = 3): string {
  const eps = 0.5 * 10 ** -digits;
  const r = Math.abs(re) < eps ? 0 : re;
  const i = Math.abs(im) < eps ? 0 : im;
  if (i === 0) return fmt(r, digits);
  if (r === 0) return `${fmt(i, digits)}i`;
  return `${fmt(r, digits)} ${i < 0 ? '−' : '+'} ${Math.abs(i).toFixed(digits)}i`;
}

export function fmtPct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

/** Angle as a (rounded) multiple of π for TeX, e.g. "\\tfrac{\\pi}{4}". Falls back to decimals. */
export function piTex(angle: number): string {
  const k = angle / Math.PI;
  for (const den of [1, 2, 3, 4, 6, 8, 12, 16]) {
    const num = Math.round(k * den);
    if (Math.abs(k * den - num) < 1e-6) {
      if (num === 0) return '0';
      const sign = num < 0 ? '-' : '';
      const n = Math.abs(num);
      const top = n === 1 ? '\\pi' : `${n}\\pi`;
      return den === 1 ? `${sign}${top}` : `${sign}\\tfrac{${top}}{${den}}`;
    }
  }
  return `${k.toFixed(3)}\\pi`;
}

/** Plain-text multiple of π: "π/4", "−3π/8". */
export function piText(angle: number): string {
  return piTex(angle)
    .replace(/\\tfrac\{([^}]*)\}\{([^}]*)\}/, '$1/$2')
    .replace(/\\pi/g, 'π')
    .replace('-', '−');
}
