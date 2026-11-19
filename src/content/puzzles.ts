import { z } from 'zod';
import { Bi } from './schema';
import { g } from '@/lib/quantum/algorithms';
import type { PuzzleSpec } from '@/lib/puzzle';

const r = String.raw;

const LevelText = z
  .object({
    id: z.number().int().positive(),
    chapter: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: Bi,
    hint: Bi,
    targetTex: z.string().min(1),
  })
  .strict();
type LevelText = z.infer<typeof LevelText>;

export type PuzzleLevel = LevelText & PuzzleSpec;

export const CHAPTERS: Record<1 | 2 | 3, Bi> = {
  1: { id: 'Satu qubit', en: 'One qubit' },
  2: { id: 'Dua qubit', en: 'Two qubits' },
  3: { id: 'Tiga qubit', en: 'Three qubits' },
};

const L = (
  text: Omit<LevelText, 'id'>,
  spec: { qubits: number; allowed: string[]; solution: PuzzleSpec['solution']; par: number; parDepth: number },
) => ({ text, spec });

const RAW = [
  L(
    {
      chapter: 1,
      title: { id: 'Balik koin', en: 'Flip the coin' },
      hint: { id: 'X membalik |0⟩ menjadi |1⟩.', en: 'X flips |0⟩ into |1⟩.' },
      targetTex: '|1\\rangle',
    },
    { qubits: 1, allowed: ['X'], solution: [g.x(0)], par: 1, parDepth: 1 },
  ),
  L(
    {
      chapter: 1,
      title: { id: 'Koin berputar', en: 'Spinning coin' },
      hint: { id: 'Hadamard membuat superposisi seimbang.', en: 'Hadamard makes an even superposition.' },
      targetTex: r`\tfrac{1}{\sqrt2}(|0\rangle + |1\rangle)`,
    },
    { qubits: 1, allowed: ['H'], solution: [g.h(0)], par: 1, parDepth: 1 },
  ),
  L(
    {
      chapter: 1,
      title: { id: 'Tanda minus', en: 'The minus sign' },
      hint: {
        id: 'Fase tidak mengubah probabilitas — tapi mengubah keadaan.',
        en: 'A phase does not change probabilities — but it changes the state.',
      },
      targetTex: r`\tfrac{1}{\sqrt2}(|0\rangle - |1\rangle)`,
    },
    { qubits: 1, allowed: ['H', 'X', 'Z'], solution: [g.x(0), g.h(0)], par: 2, parDepth: 2 },
  ),
  L(
    {
      chapter: 1,
      title: { id: 'Arah imajiner', en: 'Imaginary direction' },
      hint: {
        id: 'S memutar seperempat putaran mengelilingi sumbu z.',
        en: 'S turns a quarter turn about the z axis.',
      },
      targetTex: r`\tfrac{1}{\sqrt2}(|0\rangle + i|1\rangle)`,
    },
    { qubits: 1, allowed: ['H', 'S'], solution: [g.h(0), g.s(0)], par: 2, parDepth: 2 },
  ),
  L(
    {
      chapter: 1,
      title: { id: 'NOT tanpa X', en: 'NOT without X' },
      hint: {
        id: 'H mengubah sudut pandang: Z di antara dua H berperilaku seperti X.',
        en: 'H changes perspective: a Z between two Hs acts like an X.',
      },
      targetTex: '|1\\rangle',
    },
    { qubits: 1, allowed: ['H', 'Z'], solution: [g.h(0), g.z(0), g.h(0)], par: 3, parDepth: 3 },
  ),
  L(
    {
      chapter: 1,
      title: { id: 'Seperdelapan putaran', en: 'An eighth of a turn' },
      hint: { id: 'H·T·H memutar sedikit mengelilingi sumbu x.', en: 'H·T·H rotates a little about the x axis.' },
      targetTex: r`\cos\tfrac{\pi}{8}|0\rangle - i\sin\tfrac{\pi}{8}|1\rangle`,
    },
    { qubits: 1, allowed: ['H', 'T'], solution: [g.h(0), g.t(0), g.h(0)], par: 3, parDepth: 3 },
  ),
  L(
    {
      chapter: 1,
      title: { id: 'Sudut yang tepat', en: 'Just the right angle' },
      hint: {
        id: 'Taruh Ry lalu ketuk gerbangnya untuk mengubah sudut θ.',
        en: 'Place Ry, then tap it to change the angle θ.',
      },
      targetTex: r`\cos\tfrac{3\pi}{8}|0\rangle + \sin\tfrac{3\pi}{8}|1\rangle`,
    },
    { qubits: 1, allowed: ['RY'], solution: [g.ry(0, (3 * Math.PI) / 4)], par: 1, parDepth: 1 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Dua koin', en: 'Two coins' },
      hint: {
        id: 'Gerbang pada qubit berbeda bisa berjalan bersamaan (kedalaman 1).',
        en: 'Gates on different qubits can run side by side (depth 1).',
      },
      targetTex: r`\tfrac12(|00\rangle + |01\rangle + |10\rangle + |11\rangle)`,
    },
    { qubits: 2, allowed: ['H'], solution: [g.h(0), g.h(1)], par: 2, parDepth: 1 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Pasangan Bell', en: 'Bell pair' },
      hint: {
        id: 'Superposisi lalu CNOT: kontrol yang tidak pasti membuat target ikut tidak pasti.',
        en: 'Superposition, then CNOT: an uncertain control makes the target uncertain too.',
      },
      targetTex: r`\tfrac{1}{\sqrt2}(|00\rangle + |11\rangle)`,
    },
    { qubits: 2, allowed: ['H', 'CX'], solution: [g.h(0), g.cx(0, 1)], par: 2, parDepth: 2 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Bell bertanda minus', en: 'Bell with a minus' },
      hint: { id: 'Fase bisa dipasang sebelum CNOT.', en: 'The phase can go in before the CNOT.' },
      targetTex: r`\tfrac{1}{\sqrt2}(|00\rangle - |11\rangle)`,
    },
    { qubits: 2, allowed: ['H', 'Z', 'CX'], solution: [g.h(0), g.z(0), g.cx(0, 1)], par: 3, parDepth: 3 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Selalu berbeda', en: 'Always different' },
      hint: { id: 'Ψ⁺: kedua qubit selalu memberi hasil berlawanan.', en: 'Ψ⁺: the two qubits always disagree.' },
      targetTex: r`\tfrac{1}{\sqrt2}(|01\rangle + |10\rangle)`,
    },
    { qubits: 2, allowed: ['H', 'X', 'CX'], solution: [g.x(1), g.h(0), g.cx(0, 1)], par: 3, parDepth: 2 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Singlet', en: 'The singlet' },
      hint: { id: 'Gabungkan dua trik sebelumnya.', en: 'Combine the two previous tricks.' },
      targetTex: r`\tfrac{1}{\sqrt2}(|01\rangle - |10\rangle)`,
    },
    { qubits: 2, allowed: ['H', 'X', 'Z', 'CX'], solution: [g.x(0), g.x(1), g.h(0), g.cx(0, 1)], par: 4, parDepth: 3 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Dua NOT, nol X', en: 'Two NOTs, zero X' },
      hint: { id: 'Satu NOT sudah cukup bila diikuti CNOT.', en: 'One NOT is enough if a CNOT follows.' },
      targetTex: '|11\\rangle',
    },
    { qubits: 2, allowed: ['H', 'Z', 'CX'], solution: [g.h(0), g.z(0), g.h(0), g.cx(0, 1)], par: 4, parDepth: 4 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Fase di sudut', en: 'Phase in the corner' },
      hint: { id: 'CZ memberi tanda minus hanya pada |11⟩.', en: 'CZ puts a minus only on |11⟩.' },
      targetTex: r`\tfrac12(|00\rangle + |01\rangle + |10\rangle - |11\rangle)`,
    },
    { qubits: 2, allowed: ['H', 'CZ'], solution: [g.h(0), g.h(1), g.cz(0, 1)], par: 3, parDepth: 2 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'CZ menyamar', en: 'CZ in disguise' },
      hint: {
        id: 'CZ = H·CNOT·H pada target. Beberapa H bisa saling meniadakan.',
        en: 'CZ = H·CNOT·H on the target. Some Hs cancel out.',
      },
      targetTex: r`\tfrac12(|00\rangle + |01\rangle + |10\rangle - |11\rangle)`,
    },
    { qubits: 2, allowed: ['H', 'CX'], solution: [g.h(0), g.cx(0, 1), g.h(1)], par: 3, parDepth: 3 },
  ),
  L(
    {
      chapter: 2,
      title: { id: 'Keterikatan sebagian', en: 'Partial entanglement' },
      hint: {
        id: 'Ry menentukan bobot; CNOT menyalinnya ke qubit kedua.',
        en: 'Ry sets the weights; CNOT copies them onto the second qubit.',
      },
      targetTex: r`\cos\tfrac{\pi}{8}|00\rangle + \sin\tfrac{\pi}{8}|11\rangle`,
    },
    { qubits: 2, allowed: ['RY', 'CX'], solution: [g.ry(0, Math.PI / 4), g.cx(0, 1)], par: 2, parDepth: 2 },
  ),
  L(
    {
      chapter: 3,
      title: { id: 'Delapan sekaligus', en: 'Eight at once' },
      hint: {
        id: 'Tiga qubit, delapan kemungkinan, satu lapis gerbang.',
        en: 'Three qubits, eight possibilities, one layer of gates.',
      },
      targetTex: r`\tfrac{1}{2\sqrt2}\sum_{x=0}^{7}|x\rangle`,
    },
    { qubits: 3, allowed: ['H'], solution: [g.h(0), g.h(1), g.h(2)], par: 3, parDepth: 1 },
  ),
  L(
    {
      chapter: 3,
      title: { id: 'Keadaan GHZ', en: 'GHZ state' },
      hint: { id: 'Rantai CNOT menyebarkan keterikatan.', en: 'A chain of CNOTs spreads the entanglement.' },
      targetTex: r`\tfrac{1}{\sqrt2}(|000\rangle + |111\rangle)`,
    },
    { qubits: 3, allowed: ['H', 'CX'], solution: [g.h(0), g.cx(0, 1), g.cx(1, 2)], par: 3, parDepth: 3 },
  ),
  L(
    {
      chapter: 3,
      title: { id: 'Siap teleportasi', en: 'Ready to teleport' },
      hint: { id: 'q0 sendiri, q1 dan q2 berpasangan.', en: 'q0 on its own, q1 and q2 paired.' },
      targetTex: r`|+\rangle \otimes \tfrac{1}{\sqrt2}(|00\rangle + |11\rangle)`,
    },
    { qubits: 3, allowed: ['H', 'CX'], solution: [g.h(0), g.h(1), g.cx(1, 2)], par: 3, parDepth: 2 },
  ),
  L(
    {
      chapter: 3,
      title: { id: 'Bit paritas', en: 'Parity bit' },
      hint: { id: 'q2 harus menyimpan XOR dari q0 dan q1.', en: 'q2 must hold the XOR of q0 and q1.' },
      targetTex: r`\tfrac12(|000\rangle + |011\rangle + |101\rangle + |110\rangle)`,
    },
    { qubits: 3, allowed: ['H', 'CX'], solution: [g.h(0), g.h(1), g.cx(0, 2), g.cx(1, 2)], par: 4, parDepth: 3 },
  ),
  L(
    {
      chapter: 3,
      title: { id: 'AND kuantum', en: 'Quantum AND' },
      hint: {
        id: 'Toffoli membalik target hanya bila kedua kontrol 1.',
        en: 'Toffoli flips the target only when both controls are 1.',
      },
      targetTex: r`\tfrac12(|000\rangle + |010\rangle + |100\rangle + |111\rangle)`,
    },
    { qubits: 3, allowed: ['H', 'CCX'], solution: [g.h(0), g.h(1), g.ccx(0, 1, 2)], par: 3, parDepth: 2 },
  ),
  L(
    {
      chapter: 3,
      title: { id: 'Spiral fase', en: 'Phase spiral' },
      hint: {
        id: 'Ini QFT dari |001⟩: tiap qubit berputar dengan kecepatan berbeda — π, π/2, π/4.',
        en: 'This is the QFT of |001⟩: each qubit winds at a different speed — π, π/2, π/4.',
      },
      targetTex: r`\tfrac{1}{2\sqrt2}\sum_{y=0}^{7} e^{2\pi i\,y/8}|y\rangle`,
    },
    {
      qubits: 3,
      allowed: ['H', 'Z', 'S', 'T'],
      solution: [g.h(0), g.h(1), g.h(2), g.z(0), g.s(1), g.t(2)],
      par: 6,
      parDepth: 2,
    },
  ),
];

export const PUZZLES: PuzzleLevel[] = RAW.map((x, i) => ({
  ...LevelText.parse({ ...x.text, id: i + 1 }),
  id: i + 1,
  ...x.spec,
}));

export function getPuzzle(id: number): PuzzleLevel | undefined {
  return PUZZLES.find((p) => p.id === id);
}
