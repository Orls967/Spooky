import { packOps, type Circuit, type Op } from './circuit';

/** Small helpers to write circuits tersely. */
export const g = {
  h: (q: number): Op => ({ gate: 'H', targets: [q] }),
  x: (q: number, controls?: number[]): Op => ({ gate: 'X', targets: [q], controls }),
  z: (q: number, controls?: number[]): Op => ({ gate: 'Z', targets: [q], controls }),
  y: (q: number): Op => ({ gate: 'Y', targets: [q] }),
  s: (q: number): Op => ({ gate: 'S', targets: [q] }),
  t: (q: number): Op => ({ gate: 'T', targets: [q] }),
  cx: (c: number, t: number): Op => ({ gate: 'X', targets: [t], controls: [c] }),
  cz: (c: number, t: number): Op => ({ gate: 'Z', targets: [t], controls: [c] }),
  ccx: (c1: number, c2: number, t: number): Op => ({ gate: 'X', targets: [t], controls: [c1, c2] }),
  cp: (c: number, t: number, phi: number): Op => ({ gate: 'P', targets: [t], controls: [c], params: [phi] }),
  rx: (q: number, th: number): Op => ({ gate: 'RX', targets: [q], params: [th] }),
  ry: (q: number, th: number): Op => ({ gate: 'RY', targets: [q], params: [th] }),
  rz: (q: number, th: number): Op => ({ gate: 'RZ', targets: [q], params: [th] }),
  u3: (q: number, th: number, ph: number, la: number): Op => ({ gate: 'U3', targets: [q], params: [th, ph, la] }),
  swap: (a: number, b: number, controls?: number[]): Op => ({ gate: 'SWAP', targets: [a, b], controls }),
  m: (q: number): Op => ({ gate: 'M', targets: [q] }),
  ifx: (q: number, bit: number): Op => ({ gate: 'X', targets: [q], condition: { bit, value: 1 } }),
  ifz: (q: number, bit: number): Op => ({ gate: 'Z', targets: [q], condition: { bit, value: 1 } }),
};

/**
 * A staged circuit: ops grouped into named stages so walkthroughs can step through them.
 * `circuit` is the packed circuit of all stages; `stageEnds[k]` is the column index after stage k.
 */
export interface StagedCircuit {
  qubits: number;
  stages: { key: string; ops: Op[] }[];
}

export function stagedToCircuit(s: StagedCircuit, upToStage = s.stages.length): Circuit {
  // stages are packed independently so each stage boundary is a column boundary
  const columns: Op[][] = [];
  for (const st of s.stages.slice(0, upToStage)) columns.push(...packOps(s.qubits, st.ops).columns);
  return { qubits: s.qubits, columns };
}

/** Column index (exclusive) where each stage ends in `stagedToCircuit(s)`. */
export function stageColumnEnds(s: StagedCircuit): number[] {
  let acc = 0;
  return s.stages.map((st) => (acc += packOps(s.qubits, st.ops).columns.length));
}

export type BellKind = 'phi+' | 'phi-' | 'psi+' | 'psi-';

/** |β_xy⟩ = CNOT·(H⊗I)|xy⟩ : Φ+ = β00, Ψ+ = β01, Φ− = β10, Ψ− = β11. */
export function bellOps(kind: BellKind, a = 0, b = 1): Op[] {
  const x = kind === 'phi-' || kind === 'psi-';
  const y = kind === 'psi+' || kind === 'psi-';
  const ops: Op[] = [];
  if (x) ops.push(g.x(a));
  if (y) ops.push(g.x(b));
  ops.push(g.h(a), g.cx(a, b));
  return ops;
}

// ───────────────────────── Deutsch–Jozsa / Bernstein–Vazirani ─────────────────────────

export type DJOracle = { kind: 'constant'; value: 0 | 1 } | { kind: 'balanced'; mask: number };

/** n input qubits (0…n−1) + ancilla n. Balanced oracle: f(x) = mask·x mod 2 (mask ≠ 0). */
export function deutschJozsa(n: number, oracle: DJOracle): StagedCircuit {
  const anc = n;
  const inputs = Array.from({ length: n }, (_, i) => i);
  const oracleOps: Op[] = [];
  if (oracle.kind === 'constant') {
    if (oracle.value === 1) oracleOps.push(g.x(anc));
  } else {
    for (const i of inputs) if (oracle.mask & (1 << (n - 1 - i))) oracleOps.push(g.cx(i, anc));
  }
  return {
    qubits: n + 1,
    stages: [
      { key: 'prepare', ops: [g.x(anc)] },
      { key: 'superpose', ops: [...inputs, anc].map(g.h) },
      { key: 'oracle', ops: oracleOps },
      { key: 'interfere', ops: inputs.map(g.h) },
      { key: 'measure', ops: inputs.map(g.m) },
    ],
  };
}

export function bernsteinVazirani(n: number, secret: number): StagedCircuit {
  return deutschJozsa(n, { kind: 'balanced', mask: secret });
}

// ───────────────────────── Teleportation ─────────────────────────

/**
 * Teleport the state U3(θ,φ,0)|0⟩ from qubit 0 to qubit 2.
 * `deferred = true` replaces mid-circuit measurement + classical control by CNOT/CZ (principle of deferred measurement).
 */
export function teleportation(theta: number, phi: number, deferred = false): StagedCircuit {
  return {
    qubits: 3,
    stages: [
      { key: 'message', ops: [g.u3(0, theta, phi, 0)] },
      { key: 'bell', ops: [g.h(1), g.cx(1, 2)] },
      { key: 'entangle', ops: [g.cx(0, 1), g.h(0)] },
      deferred ? { key: 'correct', ops: [g.cx(1, 2), g.cz(0, 2)] } : { key: 'measure', ops: [g.m(0), g.m(1)] },
      ...(deferred ? [] : [{ key: 'correct', ops: [g.ifx(2, 1), g.ifz(2, 0)] }]),
    ],
  };
}

// ───────────────────────── Superdense coding ─────────────────────────

/** Send two classical bits (b0 b1) with one qubit. Bob reads them as qubits (0,1). */
export function superdense(b0: 0 | 1, b1: 0 | 1): StagedCircuit {
  const encode: Op[] = [];
  if (b1) encode.push(g.x(0));
  if (b0) encode.push(g.z(0));
  return {
    qubits: 2,
    stages: [
      { key: 'bell', ops: bellOps('phi+') },
      { key: 'encode', ops: encode },
      { key: 'decode', ops: [g.cx(0, 1), g.h(0)] },
      { key: 'measure', ops: [g.m(0), g.m(1)] },
    ],
  };
}

// ───────────────────────── Grover ─────────────────────────

export function groverIterations(n: number): number {
  return Math.max(1, Math.floor((Math.PI / 4) * Math.sqrt(2 ** n)));
}

/** Theoretical success probability after k iterations: sin²((2k+1)θ), sin θ = 1/√N. */
export function groverTheory(n: number, k: number): number {
  const th = Math.asin(1 / Math.sqrt(2 ** n));
  return Math.sin((2 * k + 1) * th) ** 2;
}

/** Multi-controlled Z over all given qubits (phase −1 on |1…1⟩). */
function mcz(qs: number[]): Op {
  const t = qs[qs.length - 1];
  return g.z(t, qs.slice(0, -1));
}

export function groverOracle(n: number, marked: number): Op[] {
  const qs = Array.from({ length: n }, (_, i) => i);
  const flips = qs.filter((q) => !(marked & (1 << (n - 1 - q)))).map((q) => g.x(q));
  return [...flips, mcz(qs), ...flips.map((o) => ({ ...o }))];
}

export function groverDiffuser(n: number): Op[] {
  const qs = Array.from({ length: n }, (_, i) => i);
  return [...qs.map(g.h), ...qs.map((q) => g.x(q)), mcz(qs), ...qs.map((q) => g.x(q)), ...qs.map(g.h)];
}

export function grover(n: number, marked: number, iterations = groverIterations(n)): StagedCircuit {
  const qs = Array.from({ length: n }, (_, i) => i);
  const stages: StagedCircuit['stages'] = [{ key: 'superpose', ops: qs.map(g.h) }];
  for (let k = 0; k < iterations; k++) {
    stages.push({ key: `oracle-${k + 1}`, ops: groverOracle(n, marked) });
    stages.push({ key: `diffuse-${k + 1}`, ops: groverDiffuser(n) });
  }
  return { qubits: n, stages };
}

// ───────────────────────── QFT ─────────────────────────

/** QFT on qubits [first, first+n) (big-endian), including final swaps. QFT|x⟩ = Σ_y e^{2πi xy/N}|y⟩/√N. */
export function qftOps(n: number, first = 0): Op[] {
  const ops: Op[] = [];
  for (let j = 0; j < n; j++) {
    ops.push(g.h(first + j));
    for (let k = j + 1; k < n; k++) ops.push(g.cp(first + k, first + j, Math.PI / 2 ** (k - j)));
  }
  for (let i = 0; i < Math.floor(n / 2); i++) ops.push(g.swap(first + i, first + n - 1 - i));
  return ops;
}

/** Inverse QFT: reversed gate order with negated phases. */
export function iqftOps(n: number, first = 0): Op[] {
  return qftOps(n, first)
    .reverse()
    .map((op) => (op.gate === 'P' ? { ...op, params: [-(op.params?.[0] ?? 0)] } : op));
}

/** Demo: prepare |x⟩ then apply the QFT. */
export function qftDemo(n: number, x: number): StagedCircuit {
  const prep: Op[] = [];
  for (let q = 0; q < n; q++) if (x & (1 << (n - 1 - q))) prep.push(g.x(q));
  const stages: StagedCircuit['stages'] = [{ key: 'input', ops: prep }];
  // one stage per qubit "rotation ladder", then the swaps
  for (let j = 0; j < n; j++) {
    const ops: Op[] = [g.h(j)];
    for (let k = j + 1; k < n; k++) ops.push(g.cp(k, j, Math.PI / 2 ** (k - j)));
    stages.push({ key: `rotate-${j}`, ops });
  }
  const swaps: Op[] = [];
  for (let i = 0; i < Math.floor(n / 2); i++) swaps.push(g.swap(i, n - 1 - i));
  stages.push({ key: 'swap', ops: swaps });
  return { qubits: n, stages };
}

// ───────────────────────── Shor (N = 15) ─────────────────────────

/**
 * Controlled multiplication by `a` mod 15 on the 4-qubit work register.
 * Work value w = Σ_k bit_k 2^k with bit k stored on qubit (workFirst + 3 − k).
 * Permutation network: rotations of the 4-bit word (×2, ×8), swaps (×4) and bit-flips (negation mod 15).
 */
export function cMulMod15(a: number, control: number, workFirst: number): Op[] {
  const q = (k: number) => workFirst + 3 - k;
  const ops: Op[] = [];
  const am = ((a % 15) + 15) % 15;
  if (am === 1) return ops;
  if (![2, 4, 7, 8, 11, 13].includes(am)) throw new RangeError(`a=${a} not coprime with 15 / unsupported`);
  if (am === 2 || am === 13)
    ops.push(g.swap(q(2), q(3), [control]), g.swap(q(1), q(2), [control]), g.swap(q(0), q(1), [control]));
  if (am === 7 || am === 8)
    ops.push(g.swap(q(0), q(1), [control]), g.swap(q(1), q(2), [control]), g.swap(q(2), q(3), [control]));
  if (am === 4 || am === 11) ops.push(g.swap(q(1), q(3), [control]), g.swap(q(0), q(2), [control]));
  if (am === 7 || am === 11 || am === 13) for (let k = 0; k < 4; k++) ops.push(g.x(q(k), [control]));
  return ops;
}

export function modPow(base: number, exp: number, mod: number): number {
  let r = 1,
    b = base % mod,
    e = exp;
  while (e > 0) {
    if (e & 1) r = (r * b) % mod;
    b = (b * b) % mod;
    e >>= 1;
  }
  return r;
}

export const SHOR_COUNTING = 4;

/** Order finding for a mod 15 with 4 counting qubits (0…3) and 4 work qubits (4…7). */
export function shor15(a: number): StagedCircuit {
  const t = SHOR_COUNTING;
  const work = t;
  const counting = Array.from({ length: t }, (_, i) => i);
  const modexp: Op[] = [];
  for (let j = 0; j < t; j++) {
    const control = t - 1 - j; // counting qubit with weight 2^j
    modexp.push(...cMulMod15(modPow(a, 2 ** j, 15), control, work));
  }
  return {
    qubits: 2 * t,
    stages: [
      { key: 'init', ops: [g.x(work + 3)] },
      { key: 'superpose', ops: counting.map(g.h) },
      { key: 'modexp', ops: modexp },
      { key: 'iqft', ops: iqftOps(t, 0) },
      { key: 'measure', ops: counting.map(g.m) },
    ],
  };
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Continued-fraction convergents of y/Q; returns the smallest denominator r ≤ maxDen with a^r ≡ 1 (mod N). */
export function periodFromMeasurement(y: number, Q: number, a: number, N: number): number | null {
  if (y === 0) return null;
  let num = y,
    den = Q;
  let h0 = 0,
    h1 = 1,
    k0 = 1,
    k1 = 0; // convergents h/k
  while (den !== 0) {
    const q = Math.floor(num / den);
    [num, den] = [den, num - q * den];
    [h0, h1] = [h1, q * h1 + h0];
    [k0, k1] = [k1, q * k1 + k0];
    for (let m = 1; k1 * m < N; m++) if (modPow(a, k1 * m, N) === 1) return k1 * m;
  }
  return null;
}

/** Classical post-processing: factors of N from an even period r. */
export function factorsFromPeriod(a: number, r: number, N: number): [number, number] | null {
  if (r % 2 !== 0) return null;
  const x = modPow(a, r / 2, N);
  if (x === N - 1) return null;
  const f1 = gcd(x - 1, N),
    f2 = gcd(x + 1, N);
  if (f1 > 1 && f1 < N && f2 > 1 && f2 < N) return [Math.min(f1, f2), Math.max(f1, f2)];
  return null;
}
