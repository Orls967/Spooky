/**
 * Eigenvalues of a Hermitian matrix (interleaved complex, row-major, size D×D) using the
 * cyclic Jacobi method on its real-symmetric 2D×2D embedding [[A, −B], [B, A]].
 * Every eigenvalue of H appears twice in the embedding; we return each once (sorted descending).
 */
export function hermitianEigenvalues(data: Float64Array, D: number): Float64Array {
  const N = 2 * D;
  const a = new Float64Array(N * N);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) {
      const re = data[2 * (i * D + j)],
        im = data[2 * (i * D + j) + 1];
      a[i * N + j] = re;
      a[(i + D) * N + (j + D)] = re;
      a[i * N + (j + D)] = -im;
      a[(i + D) * N + j] = im;
    }
  jacobiSymmetric(a, N);
  const ev = Array.from({ length: N }, (_, i) => a[i * N + i]).sort((x, y) => y - x);
  const out = new Float64Array(D);
  for (let i = 0; i < D; i++) out[i] = ev[2 * i];
  return out;
}

/** In-place cyclic Jacobi diagonalisation of a real symmetric N×N matrix. Optionally accumulates eigenvectors in `v` (columns). */
export function jacobiSymmetric(a: Float64Array, N: number, maxSweeps = 60, v?: Float64Array): void {
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < N; p++) for (let q = p + 1; q < N; q++) off += a[p * N + q] ** 2;
    if (off < 1e-22) return;
    for (let p = 0; p < N - 1; p++)
      for (let q = p + 1; q < N; q++) {
        const apq = a[p * N + q];
        if (Math.abs(apq) < 1e-300) continue;
        const app = a[p * N + p],
          aqq = a[q * N + q];
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1),
          s = t * c;
        for (let k = 0; k < N; k++) {
          const akp = a[k * N + p],
            akq = a[k * N + q];
          a[k * N + p] = c * akp - s * akq;
          a[k * N + q] = s * akp + c * akq;
        }
        for (let k = 0; k < N; k++) {
          const apk = a[p * N + k],
            aqk = a[q * N + k];
          a[p * N + k] = c * apk - s * aqk;
          a[q * N + k] = s * apk + c * aqk;
        }
        if (v)
          for (let k = 0; k < N; k++) {
            const vkp = v[k * N + p],
              vkq = v[k * N + q];
            v[k * N + p] = c * vkp - s * vkq;
            v[k * N + q] = s * vkp + c * vkq;
          }
      }
  }
}

/** Real-symmetric embedding [[A, −B], [B, A]] of a Hermitian matrix A + iB. */
function embed(data: Float64Array, D: number): Float64Array {
  const N = 2 * D;
  const a = new Float64Array(N * N);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) {
      const re = data[2 * (i * D + j)],
        im = data[2 * (i * D + j) + 1];
      a[i * N + j] = re;
      a[(i + D) * N + (j + D)] = re;
      a[i * N + (j + D)] = -im;
      a[(i + D) * N + j] = im;
    }
  return a;
}

/**
 * Principal square root of a Hermitian positive-semidefinite matrix. The embedding is a *-homomorphism,
 * so √(embed(H)) = embed(√H): diagonalise the real embedding and read the complex blocks back.
 */
export function hermitianSqrt(data: Float64Array, D: number): Float64Array {
  const N = 2 * D;
  const a = embed(data, D);
  const v = new Float64Array(N * N);
  for (let i = 0; i < N; i++) v[i * N + i] = 1;
  jacobiSymmetric(a, N, 80, v);
  const lam = Array.from({ length: N }, (_, i) => Math.sqrt(Math.max(0, a[i * N + i])));
  const out = new Float64Array(2 * D * D);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) {
      let re = 0,
        im = 0;
      for (let k = 0; k < N; k++) {
        re += v[i * N + k] * lam[k] * v[j * N + k];
        im += v[(i + D) * N + k] * lam[k] * v[j * N + k];
      }
      out[2 * (i * D + j)] = re;
      out[2 * (i * D + j) + 1] = im;
    }
  return out;
}

/** Complex D×D matrix product (interleaved, row-major). */
export function cmatMul(a: Float64Array, b: Float64Array, D: number): Float64Array {
  const out = new Float64Array(2 * D * D);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) {
      let re = 0,
        im = 0;
      for (let k = 0; k < D; k++) {
        const ar = a[2 * (i * D + k)],
          ai = a[2 * (i * D + k) + 1],
          br = b[2 * (k * D + j)],
          bi = b[2 * (k * D + j) + 1];
        re += ar * br - ai * bi;
        im += ar * bi + ai * br;
      }
      out[2 * (i * D + j)] = re;
      out[2 * (i * D + j) + 1] = im;
    }
  return out;
}
