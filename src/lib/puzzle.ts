import { circuitDepth, countGates, packOps, runCircuit, type Circuit, type Op } from './quantum/circuit';
import type { StateVector } from './quantum/statevector';

export const FIDELITY_THRESHOLD = 0.999;

/** Palette key an op corresponds to (used to enforce a level's allowed gate set). */
export function opKey(op: Op): string {
  const k = op.controls?.length ?? 0;
  if (op.gate === 'SWAP') return k ? 'CU' : 'SWAP';
  if (op.gate === 'M') return 'M';
  if (k === 0) return op.gate;
  if (op.gate === 'X') return k === 1 ? 'CX' : k === 2 ? 'CCX' : 'CU';
  if (op.gate === 'Z' && k === 1) return 'CZ';
  return 'CU';
}

export interface PuzzleSpec {
  id: number;
  qubits: number;
  allowed: readonly string[];
  solution: Op[];
  par: number;
  parDepth: number;
}

export function targetState(level: PuzzleSpec): StateVector {
  return runCircuit(packOps(level.qubits, level.solution)).state;
}

export interface Evaluation {
  fidelity: number;
  solved: boolean;
  gates: number;
  depth: number;
  stars: 0 | 1 | 2 | 3;
  /** ops using gates outside the allowed set */
  illegal: string[];
}

/** Score a candidate circuit: fidelity |⟨target|ψ⟩|² (global phase ignored), gate count and depth. */
export function evaluate(level: PuzzleSpec, circuit: Circuit, target = targetState(level)): Evaluation {
  const illegal = circuit.columns
    .flat()
    .map(opKey)
    .filter((k) => !level.allowed.includes(k));
  const state = runCircuit(circuit).state;
  const fidelity = circuit.qubits === level.qubits ? state.fidelity(target) : 0;
  const gates = countGates(circuit, { includeMeasure: true });
  const depth = circuitDepth(circuit);
  const solved = fidelity >= FIDELITY_THRESHOLD && illegal.length === 0;
  const stars: Evaluation['stars'] = !solved
    ? 0
    : gates <= level.par && depth <= level.parDepth
      ? 3
      : gates <= level.par + 2
        ? 2
        : 1;
  return { fidelity, solved, gates, depth, stars, illegal: [...new Set(illegal)] };
}
