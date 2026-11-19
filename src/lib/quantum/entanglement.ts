import { DensityMatrix } from './density';
import { cmatMul, hermitianEigenvalues, hermitianSqrt } from './linalg';
import { blochFromRho, entropyFromBloch } from './bloch';

/**
 * Wootters concurrence of a two-qubit density matrix (works for mixed states):
 *   ρ̃ = (σy⊗σy) ρ* (σy⊗σy),  λᵢ = √eig(√ρ ρ̃ √ρ) sorted descending,  C = max(0, λ₁ − λ₂ − λ₃ − λ₄).
 * C = 1 for Bell states, 0 for separable states.
 */
export function concurrence(rho: DensityMatrix): number {
  if (rho.n !== 2) throw new RangeError('concurrence is defined for two qubits');
  const D = 4;
  // σy⊗σy = antidiag(−1, 1, 1, −1) — real; ρ̃_ij = s_i s_j conj(ρ)_{3−i, 3−j} with s = [−1, 1, 1, −1]
  const s = [-1, 1, 1, -1];
  const tilde = new Float64Array(2 * D * D);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) {
      const k = 2 * ((3 - i) * D + (3 - j));
      tilde[2 * (i * D + j)] = s[i] * s[j] * rho.data[k];
      tilde[2 * (i * D + j) + 1] = -s[i] * s[j] * rho.data[k + 1];
    }
  const sq = hermitianSqrt(rho.data, D);
  const X = cmatMul(cmatMul(sq, tilde, D), sq, D);
  // symmetrise against round-off before the Hermitian eigen-solver
  for (let i = 0; i < D; i++)
    for (let j = i; j < D; j++) {
      const a = 2 * (i * D + j),
        b = 2 * (j * D + i);
      const re = (X[a] + X[b]) / 2,
        im = (X[a + 1] - X[b + 1]) / 2;
      X[a] = re;
      X[a + 1] = im;
      X[b] = re;
      X[b + 1] = -im;
    }
  const ev = Array.from(hermitianEigenvalues(X, D))
    .map((e) => Math.sqrt(Math.max(0, e)))
    .sort((x, y) => y - x);
  return Math.max(0, ev[0] - ev[1] - ev[2] - ev[3]);
}

/** Entropy (bits) of one qubit's reduced state — the entanglement entropy when the pair is pure. */
export function reducedEntropy(rho: DensityMatrix, q: number): number {
  return entropyFromBloch(blochFromRho(rho.reduceToQubit(q)));
}

/** Pure family cos θ|00⟩ + sin θ|11⟩ as a density matrix. */
export function thetaPair(theta: number): DensityMatrix {
  const r = new DensityMatrix(2, new Float64Array(32));
  const c = Math.cos(theta),
    s = Math.sin(theta);
  const amp = [c, 0, 0, s];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r.data[2 * (i * 4 + j)] = amp[i] * amp[j];
  return r;
}
