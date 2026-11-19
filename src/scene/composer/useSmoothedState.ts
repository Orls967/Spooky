import { useMemo, useRef } from 'react';
import { phaseColorLinear } from '@/lib/color';

export interface Smoothed {
  /** probability per basis state */
  p: Float32Array;
  /** linear RGB colour per basis state (by phase) */
  rgb: Float32Array;
  tp: Float32Array;
  trgb: Float32Array;
}

/**
 * Holds current vs target per-basis-state values so scenes can ease between circuit steps
 * frame by frame (exponential smoothing) without React re-renders.
 */
export function useSmoothedState(amplitudes: Float64Array, dim: number) {
  const ref = useRef<Smoothed | null>(null);
  if (!ref.current || ref.current.p.length !== dim) {
    ref.current = {
      p: new Float32Array(dim),
      rgb: new Float32Array(dim * 3),
      tp: new Float32Array(dim),
      trgb: new Float32Array(dim * 3),
    };
  }
  const s = ref.current;
  useMemo(() => {
    for (let i = 0; i < dim; i++) {
      const re = amplitudes[2 * i] ?? 0,
        im = amplitudes[2 * i + 1] ?? 0;
      const p = re * re + im * im;
      s.tp[i] = p;
      if (p > 1e-10) {
        const [r, g, b] = phaseColorLinear(Math.atan2(im, re));
        s.trgb[3 * i] = r;
        s.trgb[3 * i + 1] = g;
        s.trgb[3 * i + 2] = b;
      }
    }
  }, [amplitudes, dim, s]);
  return s;
}

/** Move current values towards targets; returns true while still moving. */
export function stepSmoothed(s: Smoothed, k: number): boolean {
  let moving = false;
  for (let i = 0; i < s.p.length; i++) {
    const d = s.tp[i] - s.p[i];
    if (Math.abs(d) > 1e-4) {
      s.p[i] += d * k;
      moving = true;
    } else s.p[i] = s.tp[i];
  }
  for (let i = 0; i < s.rgb.length; i++) {
    const d = s.trgb[i] - s.rgb[i];
    if (Math.abs(d) > 1e-3) {
      s.rgb[i] += d * k;
      moving = true;
    } else s.rgb[i] = s.trgb[i];
  }
  return moving;
}
