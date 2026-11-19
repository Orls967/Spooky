import { StateVector } from '@/lib/quantum/statevector';
import { createRng, type Rng } from '@/lib/quantum/rng';
import { C } from '@/lib/quantum/complex';

export function randomState(n: number, rng: Rng): StateVector {
  const amps = Array.from({ length: 1 << n }, () => {
    // Box–Muller gaussian → Haar-ish random state
    const u = Math.max(1e-12, rng()),
      v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    return C(r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v));
  });
  return StateVector.fromAmplitudes(amps);
}

export const rng0 = (): Rng => createRng(12345);
