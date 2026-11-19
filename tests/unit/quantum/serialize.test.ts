import { describe, expect, it } from 'vitest';
import {
  circuitFromJSON,
  circuitToJSON,
  decodeCircuitFromURL,
  encodeCircuitForURL,
  normalizeCircuit,
} from '@/lib/quantum/serialize';
import { stagedToCircuit, teleportation, grover } from '@/lib/quantum/algorithms';
import type { Circuit } from '@/lib/quantum/circuit';

const samples: Circuit[] = [
  stagedToCircuit(teleportation(1.1, 0.3, false)),
  stagedToCircuit(grover(3, 5)),
  { qubits: 2, columns: [[], [{ gate: 'U3', targets: [1], params: [0.1, 0.2, 0.3] }], []] },
];

describe('circuit serialisation', () => {
  it.each(samples.map((s, i) => [i, s] as const))('JSON round-trip #%i', (_i, c) => {
    const back = circuitFromJSON(circuitToJSON(c, 'demo'));
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.value.circuit).toEqual(normalizeCircuit(c));
      expect(back.value.name).toBe('demo');
    }
  });

  it.each(samples.map((s, i) => [i, s] as const))('URL round-trip #%i', (_i, c) => {
    const enc = encodeCircuitForURL(c);
    expect(enc).toMatch(/^[A-Za-z0-9+\-$_]*$/);
    const back = decodeCircuitFromURL(enc);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.value).toEqual(normalizeCircuit(c));
  });

  it('rejects malformed / unsafe input', () => {
    expect(circuitFromJSON('{').ok).toBe(false);
    expect(circuitFromJSON(JSON.stringify({ format: 'x' })).ok).toBe(false);
    const bad = (circuit: unknown) =>
      circuitFromJSON(JSON.stringify({ format: 'spooky-circuit', version: 1, circuit })).ok;
    expect(bad({ qubits: 11, columns: [] })).toBe(false);
    expect(bad({ qubits: 2, columns: [[{ gate: 'FOO', targets: [0] }]] })).toBe(false);
    expect(bad({ qubits: 2, columns: [[{ gate: 'X', targets: [2] }]] })).toBe(false);
    expect(bad({ qubits: 2, columns: [[{ gate: 'X', targets: [0], controls: [0] }]] })).toBe(false);
    expect(
      bad({
        qubits: 2,
        columns: [
          [
            { gate: 'H', targets: [0] },
            { gate: 'X', targets: [1], controls: [0] },
          ],
        ],
      }),
    ).toBe(false);
    expect(bad({ qubits: 2, columns: [[{ gate: 'SWAP', targets: [0] }]] })).toBe(false);
    expect(bad({ qubits: 2, columns: [[{ gate: 'RX', targets: [0] }]] })).toBe(false);
    expect(bad({ qubits: 2, columns: [[{ gate: 'H', targets: [0], extra: 1 }]] })).toBe(false);
    expect(decodeCircuitFromURL('garbage!!').ok).toBe(false);
  });
});
