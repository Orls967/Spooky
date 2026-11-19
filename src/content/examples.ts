import type { Bi } from './schema';
import type { Circuit } from '@/lib/quantum/circuit';
import { packOps } from '@/lib/quantum/circuit';
import { bellOps, g, grover, qftDemo, stagedToCircuit, teleportation, deutschJozsa } from '@/lib/quantum/algorithms';

export interface Example {
  key: string;
  name: Bi;
  build: () => Circuit;
}

export const EXAMPLES: Example[] = [
  { key: 'bell', name: { id: 'Pasangan Bell Φ+', en: 'Bell pair Φ+' }, build: () => packOps(2, bellOps('phi+')) },
  {
    key: 'ghz',
    name: { id: 'Keadaan GHZ (3 qubit)', en: 'GHZ state (3 qubits)' },
    build: () => packOps(3, [g.h(0), g.cx(0, 1), g.cx(1, 2)]),
  },
  {
    key: 'uniform',
    name: { id: 'Superposisi seragam (4 qubit)', en: 'Uniform superposition (4 qubits)' },
    build: () => packOps(4, [0, 1, 2, 3].map(g.h)),
  },
  {
    key: 'phase-kickback',
    name: { id: 'Fase relatif: H·S·H', en: 'Relative phase: H·S·H' },
    build: () => packOps(2, [g.h(0), g.h(1), g.s(1), g.t(0), g.cz(0, 1)]),
  },
  {
    key: 'teleport',
    name: { id: 'Teleportasi kuantum', en: 'Quantum teleportation' },
    build: () => stagedToCircuit(teleportation(1.1, 0.7, false)),
  },
  {
    key: 'grover3',
    name: { id: 'Grover, 3 qubit (cari |101⟩)', en: 'Grover, 3 qubits (find |101⟩)' },
    build: () => stagedToCircuit(grover(3, 5)),
  },
  { key: 'qft3', name: { id: 'QFT pada |101⟩', en: 'QFT on |101⟩' }, build: () => stagedToCircuit(qftDemo(3, 5)) },
  {
    key: 'dj',
    name: { id: 'Deutsch–Jozsa (seimbang)', en: 'Deutsch–Jozsa (balanced)' },
    build: () => stagedToCircuit(deutschJozsa(3, { kind: 'balanced', mask: 0b101 })),
  },
];
