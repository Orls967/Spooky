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

/** In-place cyclic Jacobi diagonalisation of a real symmetric N×N matrix. */
export function jacobiSymmetric(a: Float64Array, N: number, maxSweeps = 60): void {
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
      }
  }
}
