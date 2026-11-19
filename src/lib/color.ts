/**
 * "Spektra" — the cyclic phase colormap used everywhere in Spooky.
 * Defined as a closed loop in OKLab that varies in lightness (L) and the blue–yellow axis (b), the two
 * dimensions that survive red–green colour-vision deficiency; the a (red–green) axis only adds richness.
 *   0 → amber,  π/2 → mint,  π → blue,  3π/2 → rose  (and back to amber)
 */
export type RGB = [number, number, number];

const srgbGamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

/** OKLab → linear sRGB */
export function oklabToLinear(L: number, a: number, b: number): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (c: RGB) => c.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLab → linear sRGB with chroma reduced until in gamut. */
export function oklabToLinearClamped(L: number, a: number, b: number): RGB {
  let k = 1;
  let c = oklabToLinear(L, a, b);
  while (!inGamut(c) && k > 0) {
    k -= 0.02;
    c = oklabToLinear(L, a * k, b * k);
  }
  return c.map((v) => Math.min(1, Math.max(0, v))) as RGB;
}

const TAU = Math.PI * 2;

/** Phase φ (radians, any range) → OKLab of the Spektra map. */
export function phaseOklab(phi: number): [number, number, number] {
  const p = ((phi % TAU) + TAU) % TAU;
  const L = 0.71 + 0.1 * Math.sin(p + Math.PI / 4);
  const a = -0.085 * Math.sin(p) + 0.035 * Math.cos(p);
  const b = 0.135 * Math.cos(p);
  return [L, a, b];
}

/** Linear-sRGB colour for a phase (for three.js, which works in linear space). */
export function phaseColorLinear(phi: number): RGB {
  const [L, a, b] = phaseOklab(phi);
  return oklabToLinearClamped(L, a, b);
}

/** Display sRGB (0…1) colour for a phase. */
export function phaseColorSRGB(phi: number): RGB {
  return phaseColorLinear(phi).map(srgbGamma) as RGB;
}

export function rgbToCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

export const phaseCss = (phi: number): string => rgbToCss(phaseColorSRGB(phi));

/** CSS conic-gradient for the phase-wheel legend (0 at 3 o'clock, counter-clockwise like the complex plane). */
export function phaseConicGradient(steps = 24): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const phi = (i / steps) * TAU;
    // conic-gradient runs clockwise from "from" angle; we go counter-clockwise by negating
    return `${phaseCss(-phi)} ${(i / steps) * 360}deg`;
  });
  return `conic-gradient(from 90deg, ${stops.join(', ')})`;
}
