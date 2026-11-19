import LZString from 'lz-string';
import type { Circuit, Op } from './circuit';
import { CircuitFileSchema, CircuitSchema, type CircuitFile } from './schema';

/** Strip empty optional fields for compact, stable JSON. */
function cleanOp(op: Op): Op {
  const out: Op = { gate: op.gate, targets: [...op.targets] };
  if (op.controls?.length) out.controls = [...op.controls];
  if (op.params?.length) out.params = op.params.map((p) => Math.round(p * 1e10) / 1e10);
  if (op.condition) out.condition = { ...op.condition };
  return out;
}

export function normalizeCircuit(c: Circuit): Circuit {
  return { qubits: c.qubits, columns: c.columns.map((col) => col.map(cleanOp)) };
}

export function circuitToFile(c: Circuit, name?: string): CircuitFile {
  return { format: 'spooky-circuit', version: 1, ...(name ? { name } : {}), circuit: normalizeCircuit(c) };
}

export function circuitToJSON(c: Circuit, name?: string): string {
  return JSON.stringify(circuitToFile(c, name), null, 2);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function circuitFromJSON(text: string): ParseResult<{ circuit: Circuit; name?: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid JSON' };
  }
  const res = CircuitFileSchema.safeParse(raw);
  if (!res.success) return { ok: false, error: res.error.issues.map((i) => i.message).join('; ') };
  return { ok: true, value: { circuit: res.data.circuit as Circuit, name: res.data.name } };
}

/** Compact URL-safe encoding: lz-string over a terse JSON form. */
export function encodeCircuitForURL(c: Circuit): string {
  const terse = {
    q: c.qubits,
    c: c.columns.map((col) =>
      col.map((op) => {
        const o: (string | number[] | number)[] = [op.gate, op.targets];
        if (op.controls?.length || op.params?.length || op.condition) o.push(op.controls ?? []);
        if (op.params?.length || op.condition) o.push((op.params ?? []).map((p) => Math.round(p * 1e8) / 1e8));
        if (op.condition) o.push(op.condition.bit * 2 + op.condition.value);
        return o;
      }),
    ),
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(terse));
}

export function decodeCircuitFromURL(s: string): ParseResult<Circuit> {
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    if (!json) return { ok: false, error: 'empty' };
    const t = JSON.parse(json) as { q: unknown; c: unknown };
    if (!Array.isArray(t.c)) return { ok: false, error: 'bad format' };
    const columns = (t.c as unknown[]).map((col) =>
      (Array.isArray(col) ? col : []).map((o: unknown) => {
        const a = o as [string, number[], number[]?, number[]?, number?];
        const op: Record<string, unknown> = { gate: a[0], targets: a[1] };
        if (a[2]?.length) op.controls = a[2];
        if (a[3]?.length) op.params = a[3];
        if (typeof a[4] === 'number') op.condition = { bit: a[4] >> 1, value: a[4] & 1 };
        return op;
      }),
    );
    const res = CircuitSchema.safeParse({ qubits: t.q, columns });
    if (!res.success) return { ok: false, error: res.error.issues.map((i) => i.message).join('; ') };
    return { ok: true, value: res.data as Circuit };
  } catch {
    return { ok: false, error: 'decode failed' };
  }
}
