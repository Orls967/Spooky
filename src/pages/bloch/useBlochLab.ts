import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DensityMatrix } from '@/lib/quantum/density';
import { gateMatrix, GATES, type SingleGateId } from '@/lib/quantum/gates';
import { blochFromRho, gateRotation, stateFromAngles, vlen, type Vec3 } from '@/lib/quantum/bloch';
import { createRng, randomSeed, type Rng } from '@/lib/quantum/rng';
import { sampleCounts } from '@/lib/quantum/sampling';
import { BlochAnimator } from '@/scene/bloch/BlochAnimator';
import { piText } from '@/lib/format';

export type Channel = 'depolarize' | 'dephase' | 'amplitudeDamp';

export interface HistoryItem {
  label: string;
  rho: Float64Array;
}

function blochOf(r: DensityMatrix): Vec3 {
  return blochFromRho(r.reduceToQubit(0));
}

/** All Bloch Studio logic: a single-qubit density matrix + animated view. */
export function useBlochLab() {
  const animator = useMemo(() => new BlochAnimator([0, 0, 1]), []);
  const [rho, setRho] = useState(() => new DensityMatrix(1));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [noiseOn, setNoiseOn] = useState(false);
  const [channel, setChannel] = useState<Channel>('depolarize');
  const [strength, setStrength] = useState(0.15);
  const [seed, setSeed] = useState(() => randomSeed() % 100000);
  const [shots, setShots] = useState<{ counts: [number, number]; total: number; seed: number } | null>(null);
  const [lastOutcome, setLastOutcome] = useState<0 | 1 | null>(null);
  const measureRng = useRef<Rng>(createRng(seed));

  useEffect(() => () => animator.dispose(), [animator]);
  useEffect(() => {
    measureRng.current = createRng(seed ^ 0x5bd1e995);
  }, [seed]);

  const commit = useCallback((next: DensityMatrix, label: string, prev: DensityMatrix) => {
    setHistory((h) => [...h.slice(-49), { label, rho: prev.data.slice() }]);
    setRho(next);
    setShots(null);
  }, []);

  const applyNoise = useCallback(
    (r: DensityMatrix, p: number) => {
      if (channel === 'depolarize') r.depolarize(0, p);
      else if (channel === 'dephase') r.dephase(0, p);
      else r.amplitudeDamp(0, p);
    },
    [channel],
  );

  const applyGate = useCallback(
    (id: SingleGateId, params: number[] = []) => {
      const m = gateMatrix(id, params);
      const next = rho.clone().apply1(0, m);
      const { axis, angle } = gateRotation(m);
      const afterUnitary = blochOf(next);
      animator.rotate(axis, angle, afterUnitary);
      if (noiseOn && strength > 0) {
        applyNoise(next, strength);
        animator.moveTo(blochOf(next), 0.6, 'power2.out');
      }
      const label = GATES[id].params ? `${GATES[id].symbol}(${params.map(piText).join(',')})` : GATES[id].symbol;
      commit(next, label, rho);
      setLastOutcome(null);
    },
    [rho, animator, noiseOn, strength, applyNoise, commit],
  );

  const setAngles = useCallback(
    (theta: number, phi: number) => {
      const next = DensityMatrix.fromState(stateFromAngles(theta, phi));
      animator.set(blochOf(next));
      setRho(next);
      setShots(null);
      setLastOutcome(null);
    },
    [animator],
  );

  const measure = useCallback(() => {
    const next = rho.clone();
    const outcome = next.measure(0, measureRng.current());
    animator.collapse(blochOf(next));
    commit(next, `M→${outcome}`, rho);
    setLastOutcome(outcome);
  }, [rho, animator, commit]);

  const runShots = useCallback(
    (n: number, useSeed = seed) => {
      const counts = sampleCounts(rho.probabilities(), n, createRng(useSeed));
      setShots({ counts: [counts[0], counts[1]], total: n, seed: useSeed });
    },
    [rho, seed],
  );

  const decay = useCallback(() => {
    // several small noise steps, animated so the shrink is visible
    let r = rho.clone();
    const prev = rho;
    for (let k = 0; k < 6; k++) {
      r = r.clone();
      applyNoise(r, Math.max(0.05, strength));
      animator.moveTo(blochOf(r), 0.35, 'sine.inOut');
    }
    commit(r, '≋', prev);
  }, [rho, strength, applyNoise, animator, commit]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    const r = new DensityMatrix(1, last.rho.slice());
    setRho(r);
    animator.moveTo(blochOf(r), 0.5);
    setShots(null);
    setLastOutcome(null);
    setHistory(history.slice(0, -1));
  }, [history, animator]);

  const reset = useCallback(() => {
    const r = new DensityMatrix(1);
    setRho(r);
    setHistory([]);
    setShots(null);
    setLastOutcome(null);
    animator.moveTo([0, 0, 1], 0.6);
    animator.clearTrail();
  }, [animator]);

  const bloch = blochOf(rho);
  const purity = rho.purity();
  const mixedness = Math.max(0, Math.min(1, 1 - vlen(bloch)));

  return {
    animator,
    rho,
    bloch,
    purity,
    mixedness,
    history,
    noiseOn,
    setNoiseOn,
    channel,
    setChannel,
    strength,
    setStrength,
    seed,
    setSeed,
    shots,
    lastOutcome,
    applyGate,
    setAngles,
    measure,
    runShots,
    decay,
    undo,
    reset,
  };
}

export type BlochLab = ReturnType<typeof useBlochLab>;
