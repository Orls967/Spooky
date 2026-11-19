import { z } from 'zod';
import { Bi } from './schema';
import type { GateId } from '@/lib/quantum/gates';

const GateDoc = z.object({ name: Bi, desc: Bi }).strict();
export type GateDoc = z.infer<typeof GateDoc>;

export const GATE_DOCS = z.record(z.string(), GateDoc).parse({
  I: {
    name: { id: 'Identitas', en: 'Identity' },
    desc: {
      id: 'Tidak melakukan apa-apa — berguna sebagai penanda waktu.',
      en: 'Does nothing — useful as a time marker.',
    },
  },
  X: {
    name: { id: 'Pauli-X (NOT)', en: 'Pauli-X (NOT)' },
    desc: {
      id: 'Membalik |0⟩ ↔ |1⟩. Rotasi π mengelilingi sumbu x.',
      en: 'Flips |0⟩ ↔ |1⟩. A π rotation about the x axis.',
    },
  },
  Y: {
    name: { id: 'Pauli-Y', en: 'Pauli-Y' },
    desc: {
      id: 'Rotasi π mengelilingi sumbu y (membalik bit dan fase).',
      en: 'A π rotation about the y axis (bit and phase flip).',
    },
  },
  Z: {
    name: { id: 'Pauli-Z', en: 'Pauli-Z' },
    desc: {
      id: 'Membalik tanda |1⟩. Rotasi π mengelilingi sumbu z; probabilitas tidak berubah.',
      en: 'Flips the sign of |1⟩. A π rotation about z; probabilities do not change.',
    },
  },
  H: {
    name: { id: 'Hadamard', en: 'Hadamard' },
    desc: {
      id: 'Membuat superposisi: |0⟩ → |+⟩. Rotasi π mengelilingi sumbu diagonal (x+z)/√2.',
      en: 'Creates superposition: |0⟩ → |+⟩. A π rotation about the diagonal (x+z)/√2.',
    },
  },
  S: {
    name: { id: 'Fase S', en: 'S phase' },
    desc: {
      id: 'Menambah fase i pada |1⟩: rotasi π/2 mengelilingi z.',
      en: 'Adds a phase i to |1⟩: a π/2 rotation about z.',
    },
  },
  Sdg: {
    name: { id: 'S† (invers S)', en: 'S† (S inverse)' },
    desc: { id: 'Rotasi −π/2 mengelilingi z.', en: 'A −π/2 rotation about z.' },
  },
  T: {
    name: { id: 'Fase T', en: 'T phase' },
    desc: {
      id: 'Fase e^{iπ/4} pada |1⟩: rotasi π/4 mengelilingi z.',
      en: 'Phase e^{iπ/4} on |1⟩: a π/4 rotation about z.',
    },
  },
  Tdg: {
    name: { id: 'T† (invers T)', en: 'T† (T inverse)' },
    desc: { id: 'Rotasi −π/4 mengelilingi z.', en: 'A −π/4 rotation about z.' },
  },
  SX: {
    name: { id: 'Akar NOT (√X)', en: 'Square-root NOT (√X)' },
    desc: { id: 'Setengah dari X: rotasi π/2 mengelilingi x.', en: 'Half of an X: a π/2 rotation about x.' },
  },
  RX: {
    name: { id: 'Rotasi Rx(θ)', en: 'Rotation Rx(θ)' },
    desc: { id: 'Rotasi sebesar θ mengelilingi sumbu x.', en: 'Rotation by θ about the x axis.' },
  },
  RY: {
    name: { id: 'Rotasi Ry(θ)', en: 'Rotation Ry(θ)' },
    desc: {
      id: 'Rotasi sebesar θ mengelilingi sumbu y — amplitudo tetap real.',
      en: 'Rotation by θ about the y axis — amplitudes stay real.',
    },
  },
  RZ: {
    name: { id: 'Rotasi Rz(θ)', en: 'Rotation Rz(θ)' },
    desc: {
      id: 'Rotasi sebesar θ mengelilingi sumbu z (mengubah fase relatif).',
      en: 'Rotation by θ about z (changes the relative phase).',
    },
  },
  P: {
    name: { id: 'Fase P(φ)', en: 'Phase P(φ)' },
    desc: {
      id: 'Mengalikan |1⟩ dengan e^{iφ}. Sama dengan Rz(φ) hingga fase global.',
      en: 'Multiplies |1⟩ by e^{iφ}. Equal to Rz(φ) up to a global phase.',
    },
  },
  U3: {
    name: { id: 'Gerbang umum U(θ, φ, λ)', en: 'General gate U(θ, φ, λ)' },
    desc: {
      id: 'Gerbang satu-qubit paling umum (hingga fase global).',
      en: 'The most general single-qubit gate (up to global phase).',
    },
  },
  SWAP: {
    name: { id: 'SWAP', en: 'SWAP' },
    desc: { id: 'Menukar keadaan dua qubit.', en: 'Exchanges the states of two qubits.' },
  },
  M: {
    name: { id: 'Pengukuran', en: 'Measurement' },
    desc: {
      id: 'Mengukur di basis Z: hasil 0/1 acak menurut aturan Born, lalu keadaan runtuh.',
      en: 'Measures in the Z basis: a random 0/1 by the Born rule, then the state collapses.',
    },
  },
  CX: {
    name: { id: 'CNOT', en: 'CNOT' },
    desc: {
      id: 'Membalik target bila kontrol bernilai 1. Pembuat keterikatan utama.',
      en: 'Flips the target when the control is 1. The workhorse of entanglement.',
    },
  },
  CZ: {
    name: { id: 'CZ', en: 'CZ' },
    desc: {
      id: 'Fase −1 hanya pada |11⟩. Simetris antar kedua qubit.',
      en: 'Phase −1 only on |11⟩. Symmetric in both qubits.',
    },
  },
  CCX: {
    name: { id: 'Toffoli (CCNOT)', en: 'Toffoli (CCNOT)' },
    desc: {
      id: 'Membalik target bila kedua kontrol bernilai 1 — AND yang dapat dibalik.',
      en: 'Flips the target when both controls are 1 — a reversible AND.',
    },
  },
  CU: {
    name: { id: 'Controlled-U', en: 'Controlled-U' },
    desc: {
      id: 'Menerapkan gerbang satu-qubit mana pun hanya bila kontrol bernilai 1.',
      en: 'Applies any single-qubit gate only when the control is 1.',
    },
  },
} satisfies Record<GateId | 'CX' | 'CZ' | 'CCX' | 'CU', GateDoc>);
