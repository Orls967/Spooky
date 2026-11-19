import type { Rng } from './rng';

/** Draw an index from a discrete distribution using a cumulative table + binary search. */
export function makeSampler(probs: ArrayLike<number>): (r: number) => number {
  const cdf = new Float64Array(probs.length);
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    cdf[i] = acc;
  }
  const total = acc;
  return (r: number) => {
    const x = r * total;
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] > x) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };
}

/** Sample `shots` outcomes; returns counts per basis index (length = probs.length). */
export function sampleCounts(probs: ArrayLike<number>, shots: number, rng: Rng): Uint32Array {
  const counts = new Uint32Array(probs.length);
  const draw = makeSampler(probs);
  for (let s = 0; s < shots; s++) counts[draw(rng())]++;
  return counts;
}
