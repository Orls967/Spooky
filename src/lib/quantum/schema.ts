import { z } from 'zod';
import { GATE_IDS, GATES } from './gates';
import { MAX_QUBITS } from './statevector';
import { validateOp, type Circuit } from './circuit';

export const OpSchema = z
  .object({
    gate: z.enum(GATE_IDS),
    targets: z
      .array(
        z
          .number()
          .int()
          .min(0)
          .max(MAX_QUBITS - 1),
      )
      .min(1)
      .max(2),
    controls: z
      .array(
        z
          .number()
          .int()
          .min(0)
          .max(MAX_QUBITS - 1),
      )
      .max(MAX_QUBITS - 1)
      .optional(),
    params: z.array(z.number().finite()).max(3).optional(),
    condition: z.object({ bit: z.number().int().min(0), value: z.union([z.literal(0), z.literal(1)]) }).optional(),
  })
  .strict()
  .refine((op) => op.targets.length === GATES[op.gate].targets, { message: 'wrong number of targets' });

export const CircuitSchema = z
  .object({
    qubits: z.number().int().min(1).max(MAX_QUBITS),
    columns: z.array(z.array(OpSchema)).max(512),
  })
  .strict()
  .superRefine((c, ctx) => {
    c.columns.forEach((col, ci) => {
      const used = new Set<number>();
      col.forEach((op, oi) => {
        const err = validateOp(op, c.qubits);
        if (err) ctx.addIssue({ code: 'custom', message: `column ${ci} op ${oi}: ${err}`, path: ['columns', ci, oi] });
        for (const q of [...op.targets, ...(op.controls ?? [])]) {
          if (used.has(q))
            ctx.addIssue({ code: 'custom', message: `column ${ci}: qubit ${q} used twice`, path: ['columns', ci, oi] });
          used.add(q);
        }
      });
    });
  });

/** File format for saving circuits. */
export const CircuitFileSchema = z
  .object({
    format: z.literal('spooky-circuit'),
    version: z.literal(1),
    name: z.string().max(120).optional(),
    circuit: CircuitSchema,
  })
  .strict();

export type CircuitFile = z.infer<typeof CircuitFileSchema>;

export function parseCircuit(input: unknown): Circuit {
  return CircuitSchema.parse(input) as Circuit;
}
