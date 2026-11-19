import type { Circuit, Op } from './quantum/circuit';
import { GATES } from './quantum/gates';
import { piText } from './format';

export interface DiagramColors {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  box: string;
}

export const CELL = 56;
export const GUTTER = 70;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Short label of an op's box (symbol + parameters). */
export function opLabel(op: Op): { symbol: string; sub?: string } {
  const info = GATES[op.gate];
  if (op.params?.length && info.params)
    return { symbol: info.symbol, sub: op.params.slice(0, info.params).map(piText).join(',') };
  return { symbol: info.symbol };
}

/** Does the op render as a CNOT-style ⊕ / CZ-style dot instead of a box? */
export function targetGlyph(op: Op): 'oplus' | 'dot' | 'swap' | 'box' | 'meter' {
  if (op.gate === 'M') return 'meter';
  if (op.gate === 'SWAP') return 'swap';
  if (op.controls?.length && op.gate === 'X') return 'oplus';
  if (op.controls?.length && op.gate === 'Z') return 'dot';
  return 'box';
}

/** Standalone SVG of a circuit (for export). Column count trimmed to the last non-empty column. */
export function circuitToSVG(c: Circuit, colors: DiagramColors, title?: string): string {
  let last = c.columns.length;
  while (last > 0 && c.columns[last - 1].length === 0) last--;
  const cols = Math.max(1, last);
  const W = GUTTER + cols * CELL + 24;
  const top = title ? 44 : 16;
  const H = top + c.qubits * CELL + 12;
  const y = (q: number) => top + q * CELL + CELL / 2;
  const x = (k: number) => GUTTER + k * CELL + CELL / 2;
  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${colors.paper}"/>`);
  if (title)
    parts.push(
      `<text x="16" y="28" font-family="Georgia, serif" font-size="18" fill="${colors.ink}">${esc(title)}</text>`,
    );
  for (let q = 0; q < c.qubits; q++) {
    parts.push(
      `<text x="14" y="${y(q) + 4}" font-family="monospace" font-size="13" fill="${colors.muted}">q${q} |0⟩</text>`,
    );
    parts.push(
      `<line x1="${GUTTER - 6}" x2="${W - 12}" y1="${y(q)}" y2="${y(q)}" stroke="${colors.ink}" stroke-opacity=".55" stroke-width="1.2"/>`,
    );
  }
  c.columns.slice(0, cols).forEach((col, k) => {
    for (const op of col) {
      const qs = [...op.targets, ...(op.controls ?? [])];
      const lo = Math.min(...qs),
        hi = Math.max(...qs);
      if (hi > lo)
        parts.push(
          `<line x1="${x(k)}" x2="${x(k)}" y1="${y(lo)}" y2="${y(hi)}" stroke="${colors.ink}" stroke-width="1.6"/>`,
        );
      for (const cq of op.controls ?? []) parts.push(`<circle cx="${x(k)}" cy="${y(cq)}" r="5" fill="${colors.ink}"/>`);
      const glyph = targetGlyph(op);
      if (glyph === 'oplus') {
        const t = op.targets[0];
        parts.push(
          `<circle cx="${x(k)}" cy="${y(t)}" r="12" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="1.6"/><line x1="${x(k) - 12}" x2="${x(k) + 12}" y1="${y(t)}" y2="${y(t)}" stroke="${colors.ink}" stroke-width="1.6"/><line x1="${x(k)}" x2="${x(k)}" y1="${y(t) - 12}" y2="${y(t) + 12}" stroke="${colors.ink}" stroke-width="1.6"/>`,
        );
      } else if (glyph === 'dot') {
        parts.push(`<circle cx="${x(k)}" cy="${y(op.targets[0])}" r="5" fill="${colors.ink}"/>`);
      } else if (glyph === 'swap') {
        for (const t of op.targets)
          parts.push(
            `<path d="M${x(k) - 7} ${y(t) - 7} L${x(k) + 7} ${y(t) + 7} M${x(k) + 7} ${y(t) - 7} L${x(k) - 7} ${y(t) + 7}" stroke="${colors.ink}" stroke-width="1.8"/>`,
          );
      } else if (glyph === 'meter') {
        const t = op.targets[0];
        parts.push(
          `<rect x="${x(k) - 19}" y="${y(t) - 19}" width="38" height="38" rx="4" fill="${colors.box}" stroke="${colors.ink}" stroke-width="1.2"/><path d="M${x(k) - 11} ${y(t) + 6} A 12 12 0 0 1 ${x(k) + 11} ${y(t) + 6}" fill="none" stroke="${colors.ink}" stroke-width="1.4"/><line x1="${x(k)}" y1="${y(t) + 6}" x2="${x(k) + 8}" y2="${y(t) - 8}" stroke="${colors.accent}" stroke-width="1.8"/>`,
        );
      } else {
        const t = op.targets[0];
        const { symbol, sub } = opLabel(op);
        parts.push(
          `<rect x="${x(k) - 19}" y="${y(t) - 19}" width="38" height="38" rx="4" fill="${colors.box}" stroke="${colors.ink}" stroke-width="1.2"/>`,
        );
        parts.push(
          `<text x="${x(k)}" y="${y(t) + (sub ? 1 : 5)}" text-anchor="middle" font-family="monospace" font-size="${symbol.length > 2 ? 11 : 14}" font-weight="600" fill="${colors.ink}">${esc(symbol)}</text>`,
        );
        if (sub)
          parts.push(
            `<text x="${x(k)}" y="${y(t) + 13}" text-anchor="middle" font-family="monospace" font-size="8" fill="${colors.muted}">${esc(sub)}</text>`,
          );
      }
      if (op.condition)
        parts.push(
          `<text x="${x(k)}" y="${y(op.targets[0]) - 23}" text-anchor="middle" font-family="monospace" font-size="9" fill="${colors.accent}">c${op.condition.bit}=${op.condition.value}</text>`,
        );
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

/** Rasterise an SVG string to a PNG blob (2× for crisp output). */
export async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  const m = /width="(\d+)" height="(\d+)"/.exec(svg);
  const w = Number(m?.[1] ?? 800),
    h = Number(m?.[2] ?? 400);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('svg render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
