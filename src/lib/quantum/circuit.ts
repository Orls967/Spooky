import { GATES, gateMatrix, isSingleGate, type GateId } from './gates';
import { StateVector } from './statevector';
import type { Rng } from './rng';

/** One operation placed on the circuit. */
export interface Op {
  gate: GateId;
  /** target qubit(s): one for 1-qubit gates & measurement, two for SWAP */
  targets: number[];
  /** control qubits (all must be |1⟩) */
  controls?: number[];
  /** angle parameters in radians */
  params?: number[];
  /** classical condition: apply only if classical bit `bit` equals `value` */
  condition?: { bit: number; value: 0 | 1 };
}

/** A circuit is a sequence of columns ("moments"); ops in one column act on disjoint qubits. */
export interface Circuit {
  qubits: number;
  columns: Op[][];
}

export function emptyCircuit(qubits: number, columns = 0): Circuit {
  return { qubits, columns: Array.from({ length: columns }, () => []) };
}

/** All qubits an op touches. */
export function opQubits(op: Op): number[] {
  return [...op.targets, ...(op.controls ?? [])];
}

export function validateOp(op: Op, qubits: number): string | null {
  const info = GATES[op.gate];
  if (op.targets.length !== info.targets) return `${op.gate} needs ${info.targets} target(s)`;
  if ((op.params?.length ?? 0) < info.params) return `${op.gate} needs ${info.params} parameter(s)`;
  const all = opQubits(op);
  if (new Set(all).size !== all.length) return 'a qubit is used twice in one gate';
  if (all.some((q) => !Number.isInteger(q) || q < 0 || q >= qubits)) return 'qubit index out of range';
  if (op.gate === 'M' && op.controls?.length) return 'measurement cannot be controlled';
  return null;
}

export interface RunState {
  state: StateVector;
  /** classical register, one bit per qubit (written by M on that qubit); -1 = not measured yet */
  classical: Int8Array;
}

export function initialRunState(qubits: number): RunState {
  return { state: StateVector.zero(qubits), classical: new Int8Array(qubits).fill(-1) };
}

/** Apply a single op in place. `rng` is required only for measurement. */
export function applyOp(rs: RunState, op: Op, rng?: Rng): void {
  const { state } = rs;
  if (op.condition) {
    const v = rs.classical[op.condition.bit];
    if (v !== op.condition.value) return;
  }
  const controls = op.controls ?? [];
  if (op.gate === 'M') {
    const q = op.targets[0];
    const r = rng ? rng() : 0.5;
    rs.classical[q] = state.measure(q, r);
    return;
  }
  if (op.gate === 'SWAP') {
    state.swap(op.targets[0], op.targets[1], controls);
    return;
  }
  if (isSingleGate(op.gate)) {
    if (op.gate === 'I') return;
    state.apply1(op.targets[0], gateMatrix(op.gate, op.params ?? []), controls);
  }
}

/** Run a whole circuit from |0…0⟩ (or a given initial state). */
export function runCircuit(c: Circuit, rng?: Rng, initial?: StateVector): RunState {
  const rs: RunState = {
    state: initial ? initial.clone() : StateVector.zero(c.qubits),
    classical: new Int8Array(c.qubits).fill(-1),
  };
  for (const col of c.columns) for (const op of col) applyOp(rs, op, rng);
  return rs;
}

/** Run, keeping a snapshot after every column (index 0 = initial state). */
export function runWithSnapshots(c: Circuit, rng?: Rng, initial?: StateVector): RunState[] {
  const rs: RunState = {
    state: initial ? initial.clone() : StateVector.zero(c.qubits),
    classical: new Int8Array(c.qubits).fill(-1),
  };
  const snaps: RunState[] = [{ state: rs.state.clone(), classical: rs.classical.slice() }];
  for (const col of c.columns) {
    for (const op of col) applyOp(rs, op, rng);
    snaps.push({ state: rs.state.clone(), classical: rs.classical.slice() });
  }
  return snaps;
}

export function countGates(c: Circuit, opts: { includeMeasure?: boolean } = {}): number {
  let k = 0;
  for (const col of c.columns)
    for (const op of col) {
      if (op.gate === 'I') continue;
      if (op.gate === 'M' && !opts.includeMeasure) continue;
      k++;
    }
  return k;
}

/** Depth = number of non-empty columns after packing each op as early as possible. */
export function circuitDepth(c: Circuit): number {
  const level = new Array<number>(c.qubits).fill(0);
  let depth = 0;
  for (const col of c.columns)
    for (const op of col) {
      if (op.gate === 'I') continue;
      const qs = opQubits(op);
      // a condition reads the classical bit of its measured qubit
      if (op.condition) qs.push(op.condition.bit);
      const l = Math.max(...qs.map((q) => level[q])) + 1;
      for (const q of qs) level[q] = l;
      depth = Math.max(depth, l);
    }
  return depth;
}

/** Flatten ops (column order). */
export function flatOps(c: Circuit): Op[] {
  return c.columns.flat();
}

/** Pack a list of ops into columns greedily (each op in the earliest column after its qubits are free). */
export function packOps(qubits: number, ops: Op[]): Circuit {
  const cols: Op[][] = [];
  const next = new Array<number>(qubits).fill(0);
  for (const op of ops) {
    const qs = opQubits(op);
    if (op.condition) qs.push(op.condition.bit);
    // controlled / multi-qubit ops block the span between their qubits (keeps diagrams readable)
    const lo = Math.min(...qs),
      hi = Math.max(...qs);
    const span = qs.length > 1 ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : qs;
    const col = Math.max(...span.map((q) => next[q]));
    while (cols.length <= col) cols.push([]);
    cols[col].push(op);
    for (const q of span) next[q] = col + 1;
  }
  return { qubits, columns: cols };
}
