import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DensityMatrix } from '@/lib/quantum/density';
import { gateMatrix } from '@/lib/quantum/gates';
import { runCircuit } from '@/lib/quantum/circuit';
import { bellOps, type BellKind } from '@/lib/quantum/algorithms';
import { blochFromRho, type Vec3 } from '@/lib/quantum/bloch';
import { concurrence, thetaPair } from '@/lib/quantum/entanglement';
import { createRng, randomSeed, type Rng } from '@/lib/quantum/rng';
import { makeSampler } from '@/lib/quantum/sampling';
import {
  OPTIMAL_STRATEGY,
  chshValue,
  jointDistribution,
  playRounds,
  quantumWinProbability,
  type ClassicalStrategy,
  type QuantumStrategy,
  type Round,
} from '@/lib/quantum/chsh';
import { BlochAnimator } from '@/scene/bloch/BlochAnimator';
import { ThreadController } from '@/scene/spooky/ThreadController';

export type Tab = 'bell' | 'chsh' | 'entropy';
export type Basis = 'Z' | 'X';
const basisAngle = (b: Basis) => (b === 'Z' ? 0 : Math.PI / 2);

function makePair(kind: BellKind, noise: number): DensityMatrix {
  const r = DensityMatrix.fromState(runCircuit({ qubits: 2, columns: [bellOps(kind)] }).state);
  if (noise > 0) r.depolarize(0, noise).depolarize(1, noise);
  return r;
}

const reduced = (r: DensityMatrix, q: number): Vec3 => blochFromRho(r.reduceToQubit(q));

/** Rotate qubit q so that measuring Z = measuring along angle θ in the x–z plane. */
function toBasis(r: DensityMatrix, q: number, theta: number) {
  r.apply1(q, gateMatrix('RY', [-theta]));
}
function fromBasis(r: DensityMatrix, q: number, theta: number) {
  r.apply1(q, gateMatrix('RY', [theta]));
}

const axisVec = (theta: number, outcome: 0 | 1): Vec3 => {
  const s = outcome === 0 ? 1 : -1;
  return [s * Math.sin(theta), 0, s * Math.cos(theta)];
};

export interface ChshRun {
  rounds: Round[];
  seed: number;
  series: { n: number; rate: number }[];
}

export function useSpookyLab() {
  const alice = useMemo(() => new BlochAnimator([0, 0, 0]), []);
  const bob = useMemo(() => new BlochAnimator([0, 0, 0]), []);
  const thread = useMemo(() => new ThreadController(), []);
  useEffect(
    () => () => {
      alice.dispose();
      bob.dispose();
    },
    [alice, bob],
  );

  const [tab, setTab] = useState<Tab>('bell');
  const [kind, setKind] = useState<BellKind>('phi+');
  const [noise, setNoiseState] = useState(0);
  const [rho, setRho] = useState(() => makePair('phi+', 0));
  const [measured, setMeasured] = useState<[0 | 1 | null, 0 | 1 | null]>([null, null]);
  const [basisA, setBasisA] = useState<Basis>('Z');
  const [basisB, setBasisB] = useState<Basis>('Z');
  const [corr, setCorr] = useState<{ counts: number[]; total: number } | null>(null);
  const rng = useRef<Rng>(createRng(randomSeed()));

  // CHSH
  const [mode, setMode] = useState<'quantum' | 'classical'>('quantum');
  const [classical, setClassical] = useState<ClassicalStrategy>('always0');
  const [angles, setAngles] = useState<QuantumStrategy>(OPTIMAL_STRATEGY);
  const [lastRound, setLastRound] = useState<Round | null>(null);
  const [run, setRun] = useState<ChshRun | null>(null);
  const [busy, setBusy] = useState(false);

  // entropy explorer
  const [theta, setTheta] = useState(Math.PI / 4);

  /** Sync the 3D view with a pair state. */
  const show = useCallback(
    (r: DensityMatrix, opts: { flashFrom?: 'a' | 'b'; collapse?: [Vec3 | null, Vec3 | null] } = {}) => {
      const c = concurrence(r);
      if (opts.collapse) {
        const [ca, cb] = opts.collapse;
        if (ca) alice.collapse(ca);
        else alice.moveTo(reduced(r, 0), 0.6);
        if (cb) bob.collapse(cb);
        else bob.moveTo(reduced(r, 1), 0.6);
      } else {
        alice.moveTo(reduced(r, 0), 0.6);
        bob.moveTo(reduced(r, 1), 0.6);
      }
      if (opts.flashFrom) thread.flash(opts.flashFrom);
      thread.setStrength(c, opts.flashFrom ? 1.1 : 0.7);
    },
    [alice, bob, thread],
  );

  const prepare = useCallback(
    (k: BellKind = kind, p: number = noise) => {
      const r = makePair(k, p);
      setRho(r);
      setMeasured([null, null]);
      setCorr(null);
      alice.clearTrail();
      bob.clearTrail();
      show(r);
    },
    [kind, noise, show, alice, bob],
  );

  const chooseKind = useCallback(
    (k: BellKind) => {
      setKind(k);
      prepare(k, noise);
    },
    [prepare, noise],
  );

  const setNoise = useCallback(
    (p: number) => {
      setNoiseState(p);
      prepare(kind, p);
    },
    [prepare, kind],
  );

  const measure = useCallback(
    (side: 0 | 1) => {
      if (measured[side] !== null) return;
      const th = basisAngle(side === 0 ? basisA : basisB);
      const r = rho.clone();
      toBasis(r, side, th);
      const outcome = r.measure(side, rng.current());
      fromBasis(r, side, th);
      setRho(r);
      const next: [0 | 1 | null, 0 | 1 | null] = [...measured];
      next[side] = outcome;
      setMeasured(next);
      const collapse: [Vec3 | null, Vec3 | null] = [null, null];
      collapse[side] = axisVec(th, outcome);
      show(r, { flashFrom: side === 0 ? 'a' : 'b', collapse });
    },
    [rho, measured, basisA, basisB, show],
  );

  const runCorrelations = useCallback(
    (n: number) => {
      const fresh = makePair(kind, noise);
      const p = jointDistribution(fresh, basisAngle(basisA), basisAngle(basisB));
      const draw = makeSampler(p);
      const counts = [0, 0, 0, 0];
      const r = createRng(randomSeed());
      for (let i = 0; i < n; i++) counts[draw(r())]++;
      setCorr({ counts, total: n });
    },
    [kind, noise, basisA, basisB],
  );

  // ── CHSH ──
  const chshPair = useMemo(() => makePair('phi+', noise), [noise]);
  const theory = useMemo(
    () =>
      mode === 'quantum'
        ? { win: quantumWinProbability(chshPair, angles), S: chshValue(chshPair, angles) }
        : { win: classical === 'always0' ? 0.75 : 0.5, S: classical === 'always0' ? 2 : 0 },
    [mode, chshPair, angles, classical],
  );

  const playOne = useCallback(() => {
    if (busy) return;
    setBusy(true);
    const R = rng.current;
    const x = (R() < 0.5 ? 0 : 1) as 0 | 1;
    const y = (R() < 0.5 ? 0 : 1) as 0 | 1;
    let a: 0 | 1, b: 0 | 1;
    if (mode === 'quantum') {
      const ta = x ? angles.a1 : angles.a0;
      const tb = y ? angles.b1 : angles.b0;
      const r = chshPair.clone();
      show(r);
      // Alice: sample from her marginal, then condition the pair on her outcome
      toBasis(r, 0, ta);
      const pa1 = r.probOf(0, 1);
      a = R() < pa1 ? 1 : 0;
      r.project(0, a);
      fromBasis(r, 0, ta);
      const afterA = r.clone();
      // Bob: conditional on Alice
      toBasis(r, 1, tb);
      const pb1 = r.probOf(1, 1);
      b = R() < pb1 ? 1 : 0;
      r.project(1, b);
      fromBasis(r, 1, tb);
      setTimeout(() => {
        alice.collapse(axisVec(ta, a));
        bob.moveTo(reduced(afterA, 1), 0.5);
        thread.flash('a');
        thread.setStrength(0, 1.0);
      }, 250);
      setTimeout(() => bob.collapse(axisVec(tb, b)), 1100);
    } else {
      const rr = playRounds(1, R, { kind: 'classical', strategy: classical })[0];
      a = rr.a;
      b = rr.b;
      thread.setStrength(0, 0.5);
      alice.collapse(axisVec(0, a));
      setTimeout(() => bob.collapse(axisVec(0, b)), 400);
    }
    const round: Round = { x, y, a, b, win: (a ^ b) === (x & y) };
    setTimeout(
      () => {
        setLastRound(round);
        setBusy(false);
      },
      mode === 'quantum' ? 1500 : 700,
    );
    // a fresh entangled pair re-forms for the next round
    if (mode === 'quantum') setTimeout(() => thread.setStrength(concurrence(chshPair), 1.2), 2600);
  }, [busy, mode, angles, chshPair, classical, alice, bob, thread, show]);

  const playMany = useCallback(
    (n: number, seed = randomSeed() % 100000) => {
      const rounds = playRounds(
        n,
        createRng(seed),
        mode === 'quantum'
          ? { kind: 'quantum', rho: chshPair, strategy: angles }
          : { kind: 'classical', strategy: classical },
      );
      const series: { n: number; rate: number }[] = [];
      let wins = 0;
      rounds.forEach((r, i) => {
        if (r.win) wins++;
        if (i < 50 || (i + 1) % Math.max(1, Math.floor(n / 200)) === 0) series.push({ n: i + 1, rate: wins / (i + 1) });
      });
      setRun({ rounds, seed, series });
    },
    [mode, chshPair, angles, classical],
  );

  // ── entropy explorer ──
  const thetaRho = useMemo(() => thetaPair(theta), [theta]);

  // keep the scene in sync with the active tab
  useEffect(() => {
    if (tab === 'entropy') show(thetaRho);
    else if (tab === 'chsh') show(chshPair);
    else show(rho);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, thetaRho]);

  return {
    alice,
    bob,
    thread,
    tab,
    setTab,
    kind,
    chooseKind,
    noise,
    setNoise,
    rho,
    measured,
    basisA,
    basisB,
    setBasisA,
    setBasisB,
    measure,
    prepare,
    corr,
    runCorrelations,
    concurrence: concurrence(tab === 'entropy' ? thetaRho : rho),
    mode,
    setMode,
    classical,
    setClassical,
    angles,
    setAngles,
    theory,
    lastRound,
    playOne,
    playMany,
    run,
    busy,
    theta,
    setTheta,
    thetaRho,
    axisA:
      tab === 'chsh' && mode === 'quantum'
        ? lastRound?.x
          ? angles.a1
          : angles.a0
        : tab === 'bell'
          ? basisAngle(basisA)
          : null,
    axisB:
      tab === 'chsh' && mode === 'quantum'
        ? lastRound?.y
          ? angles.b1
          : angles.b0
        : tab === 'bell'
          ? basisAngle(basisB)
          : null,
  };
}

export type SpookyLab = ReturnType<typeof useSpookyLab>;
