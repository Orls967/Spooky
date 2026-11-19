import type { Op } from '@/lib/quantum/circuit';
import type { GateId } from '@/lib/quantum/gates';

export interface PaletteItem {
  key: string;
  label: string;
  /** doc key in GATE_DOCS */
  doc: string;
  group: 'single' | 'rotation' | 'multi' | 'measure';
  /** build the op when dropped on qubit q in an n-qubit circuit */
  make: (q: number, n: number) => Op | null;
}

const single = (
  gate: GateId,
  label: string,
  group: PaletteItem['group'] = 'single',
  params?: number[],
): PaletteItem => ({
  key: gate,
  label,
  doc: gate,
  group,
  make: (q) => ({ gate, targets: [q], ...(params ? { params } : {}) }),
});

/** pick two adjacent wires starting at q (shifted up if q is the last wire) */
const pair = (q: number, n: number): [number, number] | null => (n < 2 ? null : q + 1 < n ? [q, q + 1] : [q - 1, q]);

export const PALETTE: PaletteItem[] = [
  single('H', 'H'),
  single('X', 'X'),
  single('Y', 'Y'),
  single('Z', 'Z'),
  single('S', 'S'),
  single('Sdg', 'S†'),
  single('T', 'T'),
  single('Tdg', 'T†'),
  single('SX', '√X'),
  single('RX', 'Rx', 'rotation', [Math.PI / 2]),
  single('RY', 'Ry', 'rotation', [Math.PI / 2]),
  single('RZ', 'Rz', 'rotation', [Math.PI / 2]),
  single('P', 'P', 'rotation', [Math.PI / 4]),
  single('U3', 'U', 'rotation', [Math.PI / 2, 0, Math.PI]),
  {
    key: 'CX',
    label: 'CNOT',
    doc: 'CX',
    group: 'multi',
    make: (q, n) => {
      const p = pair(q, n);
      return p ? { gate: 'X', targets: [p[1]], controls: [p[0]] } : null;
    },
  },
  {
    key: 'CZ',
    label: 'CZ',
    doc: 'CZ',
    group: 'multi',
    make: (q, n) => {
      const p = pair(q, n);
      return p ? { gate: 'Z', targets: [p[1]], controls: [p[0]] } : null;
    },
  },
  {
    key: 'SWAP',
    label: 'SWAP',
    doc: 'SWAP',
    group: 'multi',
    make: (q, n) => {
      const p = pair(q, n);
      return p ? { gate: 'SWAP', targets: [p[0], p[1]] } : null;
    },
  },
  {
    key: 'CCX',
    label: 'CCX',
    doc: 'CCX',
    group: 'multi',
    make: (q, n) => {
      if (n < 3) return null;
      const s = Math.min(q, n - 3);
      return { gate: 'X', targets: [s + 2], controls: [s, s + 1] };
    },
  },
  {
    key: 'CU',
    label: 'C-U',
    doc: 'CU',
    group: 'multi',
    make: (q, n) => {
      const p = pair(q, n);
      return p ? { gate: 'RY', targets: [p[1]], controls: [p[0]], params: [Math.PI / 2] } : null;
    },
  },
  single('M', 'M', 'measure'),
];

export const PALETTE_BY_KEY = Object.fromEntries(PALETTE.map((p) => [p.key, p]));
