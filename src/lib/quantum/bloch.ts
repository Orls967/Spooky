import { C } from './complex';
import type { Mat2 } from './matrix';
import { StateVector } from './statevector';
import { entropyOfEigenvalues } from './density';

export type Vec3 = [number, number, number];

/** Reduced density matrix of one qubit from an n-qubit pure state: ρ_q = Tr_{others}|ψ⟩⟨ψ|. */
export function reducedQubit(s: StateVector, q: number): Mat2 {
  const b = s.bit(q),
    d = s.data;
  let r00 = 0,
    r11 = 0,
    r01r = 0,
    r01i = 0;
  for (let i = 0; i < s.dim; i++) {
    if (i & b) continue;
    const j = i | b;
    const ar = d[2 * i],
      ai = d[2 * i + 1],
      br = d[2 * j],
      bi = d[2 * j + 1];
    r00 += ar * ar + ai * ai;
    r11 += br * br + bi * bi;
    // ρ01 = Σ ψ(0,rest) ψ(1,rest)*
    r01r += ar * br + ai * bi;
    r01i += ai * br - ar * bi;
  }
  return Float64Array.of(r00, 0, r01r, r01i, r01r, -r01i, r11, 0);
}

/** Bloch vector (x, y, z) of a 2×2 density matrix: ρ = (I + r·σ)/2. */
export function blochFromRho(rho: Mat2): Vec3 {
  return [2 * rho[2], -2 * rho[3], rho[0] - rho[6]];
}

export function blochOfQubit(s: StateVector, q: number): Vec3 {
  return blochFromRho(reducedQubit(s, q));
}

export const vlen = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);

/** Purity of a single-qubit state from its Bloch vector: (1 + |r|²)/2. */
export const purityFromBloch = (v: Vec3): number => (1 + vlen(v) ** 2) / 2;

/** Von Neumann entropy (bits) of a qubit from its Bloch vector — eigenvalues (1 ± |r|)/2. */
export function entropyFromBloch(v: Vec3): number {
  const r = Math.min(1, vlen(v));
  return entropyOfEigenvalues([(1 + r) / 2, (1 - r) / 2]);
}

/** Spherical angles of a Bloch vector: θ ∈ [0, π] from +z, φ ∈ (−π, π] from +x. */
export function blochAngles(v: Vec3): { theta: number; phi: number } {
  const r = vlen(v);
  if (r < 1e-12) return { theta: 0, phi: 0 };
  return { theta: Math.acos(Math.max(-1, Math.min(1, v[2] / r))), phi: Math.atan2(v[1], v[0]) };
}

/** |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩ */
export function stateFromAngles(theta: number, phi: number): StateVector {
  return StateVector.fromAmplitudes([
    C(Math.cos(theta / 2)),
    C(Math.cos(phi) * Math.sin(theta / 2), Math.sin(phi) * Math.sin(theta / 2)),
  ]);
}

/**
 * Rotation on the Bloch sphere performed by a single-qubit unitary.
 * Any U = e^{iα} (cos(θ/2) I − i sin(θ/2) n·σ); we return the unit axis n and angle θ ∈ [0, π]·2.
 * The Bloch vector rotates by θ about n (right-hand rule).
 */
export function gateRotation(m: Mat2): { axis: Vec3; angle: number } {
  // remove global phase: divide by sqrt(det U)
  const [ar, ai, br, bi, cr, ci, dr, di] = m;
  const detr = ar * dr - ai * di - (br * cr - bi * ci);
  const deti = ar * di + ai * dr - (br * ci + bi * cr);
  const detArg = Math.atan2(deti, detr) / 2;
  const pr = Math.cos(-detArg),
    pi = Math.sin(-detArg);
  const rot = (re: number, im: number): [number, number] => [re * pr - im * pi, re * pi + im * pr];
  const [v00r, v00i] = rot(ar, ai);
  const [v01r, v01i] = rot(br, bi);
  const [v10r, v10i] = rot(cr, ci);
  const [v11r, v11i] = rot(dr, di);
  let c = (v00r + v11r) / 2;
  let sx = -(v01i + v10i) / 2;
  let sy = (v10r - v01r) / 2;
  let sz = -(v00i - v11i) / 2;
  // SU(2) double cover: choose the representative with cos(θ/2) ≥ 0 so that θ ∈ [0, π]
  if (c < 0) {
    c = -c;
    sx = -sx;
    sy = -sy;
    sz = -sz;
  }
  const s = Math.hypot(sx, sy, sz);
  if (s < 1e-12) return { axis: [0, 0, 1], angle: 0 };
  return { axis: [sx / s, sy / s, sz / s], angle: 2 * Math.atan2(s, c) };
}

/** Rodrigues rotation of v about unit axis k by angle a. */
export function rotateVec(v: Vec3, k: Vec3, a: number): Vec3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cross: Vec3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [
    v[0] * c + cross[0] * s + k[0] * dot * (1 - c),
    v[1] * c + cross[1] * s + k[1] * dot * (1 - c),
    v[2] * c + cross[2] * s + k[2] * dot * (1 - c),
  ];
}
