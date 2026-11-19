/**
 * CPU mirror of three.js' AgX tone mapping (src/nodes/display/ToneMappingFunctions.js) and a numeric inverse.
 * Used so that themed background colours come out *exactly* as designed after the output transform:
 * we feed the renderer the colour that AgX maps onto the target.
 */
type V3 = [number, number, number];
/** column-major 3×3 (as TSL mat3(vec3 col0, vec3 col1, vec3 col2)) */
type M3 = [V3, V3, V3];

const mul = (m: M3, v: V3): V3 => [
  m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
  m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
  m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
];

const SRGB_TO_2020: M3 = [
  [0.6274, 0.0691, 0.0164],
  [0.3293, 0.9195, 0.088],
  [0.0433, 0.0113, 0.8956],
];
const R2020_TO_SRGB: M3 = [
  [1.6605, -0.1246, -0.0182],
  [-0.5876, 1.1329, -0.1006],
  [-0.0728, -0.0083, 1.1187],
];
const INSET: M3 = [
  [0.856627153315983, 0.137318972929847, 0.11189821299995],
  [0.0951212405381588, 0.761241990602591, 0.0767994186031903],
  [0.0482516061458583, 0.101439036467562, 0.811302368396859],
];
const OUTSET: M3 = [
  [1.1271005818144368, -0.1413297634984383, -0.14132976349843826],
  [-0.11060664309660323, 1.157823702216272, -0.11060664309660294],
  [-0.016493938717834573, -0.016493938717834257, 1.2519364065950405],
];
const MIN_EV = -12.47393,
  MAX_EV = 4.026069;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const contrast = (x: number) => {
  const x2 = x * x,
    x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
};

export function agx(c: V3, exposure = 1): V3 {
  let v: V3 = [c[0] * exposure, c[1] * exposure, c[2] * exposure];
  v = mul(INSET, mul(SRGB_TO_2020, v));
  v = v.map((x) => contrast(clamp01((Math.log2(Math.max(x, 1e-10)) - MIN_EV) / (MAX_EV - MIN_EV)))) as V3;
  v = mul(OUTSET, v).map((x) => Math.pow(Math.max(0, x), 2.2)) as V3;
  return mul(R2020_TO_SRGB, v).map(clamp01) as V3;
}

/** Find linear input x with agx(x) ≈ target (linear sRGB). Newton iterations in log space. */
export function inverseAgx(target: V3, exposure = 1): V3 {
  let y: V3 = target.map((t) => Math.log2(Math.max(t, 1e-4))) as V3;
  const f = (yy: V3) => agx(yy.map((k) => 2 ** k) as V3, exposure);
  for (let it = 0; it < 40; it++) {
    const out = f(y);
    const r: V3 = [out[0] - target[0], out[1] - target[1], out[2] - target[2]];
    if (Math.hypot(...r) < 1e-5) break;
    // numeric Jacobian
    const J: number[][] = [[], [], []];
    const h = 1e-4;
    for (let j = 0; j < 3; j++) {
      const yp = [...y] as V3;
      yp[j] += h;
      const o = f(yp);
      for (let i = 0; i < 3; i++) J[i][j] = (o[i] - out[i]) / h;
    }
    const d = solve3(J, r);
    if (!d) break;
    y = [y[0] - d[0], y[1] - d[1], y[2] - d[2]].map((k) => Math.min(6, Math.max(-14, k))) as V3;
  }
  return y.map((k) => 2 ** k) as V3;
}

function solve3(A: number[][], b: V3): V3 | null {
  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  if (Math.abs(det) < 1e-14) return null;
  const rep = (col: number): number[][] => A.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)));
  const d = (M: number[][]) =>
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  return [d(rep(0)) / det, d(rep(1)) / det, d(rep(2)) / det];
}

export function srgbHexToLinear(hex: string): V3 {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as V3;
}
