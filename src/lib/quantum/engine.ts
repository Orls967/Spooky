import { runWithSnapshots, runCircuit, type Circuit } from './circuit';
import { createRng } from './rng';
import { sampleCounts } from './sampling';
import { blochOfQubit, type Vec3 } from './bloch';

/** Serializable snapshot of the register after a circuit column. */
export interface StepSnapshot {
  /** interleaved re/im amplitudes */
  amplitudes: Float64Array;
  probabilities: Float64Array;
  /** reduced single-qubit Bloch vectors (length < 1 ⇒ entangled with the rest / mixed) */
  bloch: Vec3[];
  /** classical bits (−1 = unmeasured) */
  classical: number[];
}

export interface SimulationResult {
  qubits: number;
  snapshots: StepSnapshot[];
}

export function simulate(circuit: Circuit, seed: number): SimulationResult {
  const snaps = runWithSnapshots(circuit, createRng(seed));
  return {
    qubits: circuit.qubits,
    snapshots: snaps.map((rs) => ({
      amplitudes: rs.state.data,
      probabilities: rs.state.probabilities(),
      bloch: Array.from({ length: circuit.qubits }, (_, q) => blochOfQubit(rs.state, q)),
      classical: Array.from(rs.classical),
    })),
  };
}

function hasMidCircuitClassical(c: Circuit): boolean {
  return c.columns.some((col) => col.some((op) => op.gate === 'M' || op.condition));
}

export const MAX_RERUN_SHOTS = 4096;

/**
 * Measurement statistics of the full register at the end of the circuit.
 * Circuits without measurement/conditions are sampled from the final distribution; circuits with
 * mid-circuit measurement are re-run shot by shot so classical feed-forward is respected.
 */
export function sampleShots(circuit: Circuit, shots: number, seed: number): Uint32Array {
  const rng = createRng(seed);
  if (!hasMidCircuitClassical(circuit)) {
    return sampleCounts(runCircuit(circuit).state.probabilities(), shots, rng);
  }
  const counts = new Uint32Array(1 << circuit.qubits);
  const n = Math.min(shots, MAX_RERUN_SHOTS);
  for (let s = 0; s < n; s++) {
    const st = runCircuit(circuit, rng).state;
    counts[sampleCounts(st.probabilities(), 1, rng).findIndex((v) => v > 0)]++;
  }
  return counts;
}

export const engine = { simulate, sampleShots };
export type Engine = typeof engine;
