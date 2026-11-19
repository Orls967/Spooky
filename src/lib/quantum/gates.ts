import { C, expi } from './complex';
import { mat2, type Mat2 } from './matrix';

/**
 * Gate catalogue. Multi-qubit gates are expressed as a base gate + `controls`
 * (CNOT = X with one control, Toffoli = X with two, CZ = Z with one, controlled-U = any 1-qubit gate with controls).
 * SWAP acts on two targets (and may itself be controlled → Fredkin).
 */
export const SINGLE_QUBIT_GATES = [
  'I',
  'X',
  'Y',
  'Z',
  'H',
  'S',
  'Sdg',
  'T',
  'Tdg',
  'SX',
  'RX',
  'RY',
  'RZ',
  'P',
  'U3',
] as const;
export type SingleGateId = (typeof SINGLE_QUBIT_GATES)[number];
export const GATE_IDS = [...SINGLE_QUBIT_GATES, 'SWAP', 'M'] as const;
export type GateId = (typeof GATE_IDS)[number];

export interface GateInfo {
  id: GateId;
  /** short symbol drawn on the circuit */
  symbol: string;
  /** number of angle parameters */
  params: number;
  /** number of target qubits */
  targets: 1 | 2;
  /** KaTeX for the matrix (single-qubit gates) */
  tex?: string;
  /** symbolic parameter names */
  paramNames?: string[];
}

export const GATES: Record<GateId, GateInfo> = {
  I: { id: 'I', symbol: 'I', params: 0, targets: 1, tex: '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}' },
  X: { id: 'X', symbol: 'X', params: 0, targets: 1, tex: '\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}' },
  Y: { id: 'Y', symbol: 'Y', params: 0, targets: 1, tex: '\\begin{pmatrix}0&-i\\\\i&0\\end{pmatrix}' },
  Z: { id: 'Z', symbol: 'Z', params: 0, targets: 1, tex: '\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}' },
  H: {
    id: 'H',
    symbol: 'H',
    params: 0,
    targets: 1,
    tex: '\\tfrac{1}{\\sqrt2}\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}',
  },
  S: { id: 'S', symbol: 'S', params: 0, targets: 1, tex: '\\begin{pmatrix}1&0\\\\0&i\\end{pmatrix}' },
  Sdg: { id: 'Sdg', symbol: 'S†', params: 0, targets: 1, tex: '\\begin{pmatrix}1&0\\\\0&-i\\end{pmatrix}' },
  T: { id: 'T', symbol: 'T', params: 0, targets: 1, tex: '\\begin{pmatrix}1&0\\\\0&e^{i\\pi/4}\\end{pmatrix}' },
  Tdg: { id: 'Tdg', symbol: 'T†', params: 0, targets: 1, tex: '\\begin{pmatrix}1&0\\\\0&e^{-i\\pi/4}\\end{pmatrix}' },
  SX: {
    id: 'SX',
    symbol: '√X',
    params: 0,
    targets: 1,
    tex: '\\tfrac12\\begin{pmatrix}1+i&1-i\\\\1-i&1+i\\end{pmatrix}',
  },
  RX: {
    id: 'RX',
    symbol: 'Rx',
    params: 1,
    targets: 1,
    paramNames: ['θ'],
    tex: '\\begin{pmatrix}\\cos\\frac\\theta2&-i\\sin\\frac\\theta2\\\\-i\\sin\\frac\\theta2&\\cos\\frac\\theta2\\end{pmatrix}',
  },
  RY: {
    id: 'RY',
    symbol: 'Ry',
    params: 1,
    targets: 1,
    paramNames: ['θ'],
    tex: '\\begin{pmatrix}\\cos\\frac\\theta2&-\\sin\\frac\\theta2\\\\\\sin\\frac\\theta2&\\cos\\frac\\theta2\\end{pmatrix}',
  },
  RZ: {
    id: 'RZ',
    symbol: 'Rz',
    params: 1,
    targets: 1,
    paramNames: ['θ'],
    tex: '\\begin{pmatrix}e^{-i\\theta/2}&0\\\\0&e^{i\\theta/2}\\end{pmatrix}',
  },
  P: {
    id: 'P',
    symbol: 'P',
    params: 1,
    targets: 1,
    paramNames: ['φ'],
    tex: '\\begin{pmatrix}1&0\\\\0&e^{i\\varphi}\\end{pmatrix}',
  },
  U3: {
    id: 'U3',
    symbol: 'U',
    params: 3,
    targets: 1,
    paramNames: ['θ', 'φ', 'λ'],
    tex: '\\begin{pmatrix}\\cos\\frac\\theta2&-e^{i\\lambda}\\sin\\frac\\theta2\\\\e^{i\\varphi}\\sin\\frac\\theta2&e^{i(\\varphi+\\lambda)}\\cos\\frac\\theta2\\end{pmatrix}',
  },
  SWAP: { id: 'SWAP', symbol: '×', params: 0, targets: 2 },
  M: { id: 'M', symbol: 'M', params: 0, targets: 1 },
};

const S2 = Math.SQRT1_2;

/** Unitary of a single-qubit gate. */
export function gateMatrix(id: SingleGateId, params: readonly number[] = []): Mat2 {
  const [a = 0, b = 0, c = 0] = params;
  switch (id) {
    case 'I':
      return mat2(C(1), C(0), C(0), C(1));
    case 'X':
      return mat2(C(0), C(1), C(1), C(0));
    case 'Y':
      return mat2(C(0), C(0, -1), C(0, 1), C(0));
    case 'Z':
      return mat2(C(1), C(0), C(0), C(-1));
    case 'H':
      return mat2(C(S2), C(S2), C(S2), C(-S2));
    case 'S':
      return mat2(C(1), C(0), C(0), C(0, 1));
    case 'Sdg':
      return mat2(C(1), C(0), C(0), C(0, -1));
    case 'T':
      return mat2(C(1), C(0), C(0), expi(Math.PI / 4));
    case 'Tdg':
      return mat2(C(1), C(0), C(0), expi(-Math.PI / 4));
    case 'SX':
      return mat2(C(0.5, 0.5), C(0.5, -0.5), C(0.5, -0.5), C(0.5, 0.5));
    case 'RX': {
      const co = Math.cos(a / 2),
        si = Math.sin(a / 2);
      return mat2(C(co), C(0, -si), C(0, -si), C(co));
    }
    case 'RY': {
      const co = Math.cos(a / 2),
        si = Math.sin(a / 2);
      return mat2(C(co), C(-si), C(si), C(co));
    }
    case 'RZ':
      return mat2(expi(-a / 2), C(0), C(0), expi(a / 2));
    case 'P':
      return mat2(C(1), C(0), C(0), expi(a));
    case 'U3': {
      // U3(θ, φ, λ) — OpenQASM convention
      const co = Math.cos(a / 2),
        si = Math.sin(a / 2);
      const el = expi(c),
        ep = expi(b),
        epl = expi(b + c);
      return mat2(C(co), C(-el.re * si, -el.im * si), C(ep.re * si, ep.im * si), C(epl.re * co, epl.im * co));
    }
  }
}

export function isSingleGate(id: GateId): id is SingleGateId {
  return (SINGLE_QUBIT_GATES as readonly string[]).includes(id);
}

/** Inverse of a single-qubit gate expressed as another catalogue gate (for undo-able / inverse circuits). */
export function inverseGate(
  id: SingleGateId,
  params: readonly number[] = [],
): { gate: SingleGateId; params: number[] } {
  switch (id) {
    case 'S':
      return { gate: 'Sdg', params: [] };
    case 'Sdg':
      return { gate: 'S', params: [] };
    case 'T':
      return { gate: 'Tdg', params: [] };
    case 'Tdg':
      return { gate: 'T', params: [] };
    case 'SX':
      return { gate: 'U3', params: [-Math.PI / 2, -Math.PI / 2, Math.PI / 2] };
    case 'RX':
    case 'RY':
    case 'RZ':
    case 'P':
      return { gate: id, params: [-(params[0] ?? 0)] };
    case 'U3':
      return { gate: 'U3', params: [-(params[0] ?? 0), -(params[2] ?? 0), -(params[1] ?? 0)] };
    default:
      return { gate: id, params: [] };
  }
}
