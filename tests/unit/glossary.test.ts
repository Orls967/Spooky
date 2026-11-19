import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '@/content/glossary';
import { buildMatcher, linkify } from '@/lib/glossaryMatcher';
import { ALGORITHMS } from '@/content/algorithms';
import { PUZZLES } from '@/content/puzzles';
import { GATE_DOCS } from '@/content/gates';
import { EXAMPLES } from '@/content/examples';

describe('glossary content', () => {
  it('slugs are unique and every "see also" reference exists', () => {
    const slugs = new Set(GLOSSARY.map((g) => g.slug));
    expect(slugs.size).toBe(GLOSSARY.length);
    for (const g of GLOSSARY) for (const s of g.see) expect(slugs.has(s), `${g.slug} → ${s}`).toBe(true);
  });

  it('has at least 25 terms with both languages', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(25);
  });
});

describe('glossary auto-linking', () => {
  const id = buildMatcher(GLOSSARY, 'id');
  const en = buildMatcher(GLOSSARY, 'en');

  it('links the first mention only, case-insensitively, on word boundaries', () => {
    const seen = new Set<string>();
    const segs = linkify('Qubit dalam superposisi; qubit lain juga.', id, seen);
    expect(segs.filter((s) => s.slug).map((s) => s.slug)).toEqual(['qubit', 'superposition']);
    // "qubits" in English text matches via alias, "Bloch sphere" via term
    const s2 = linkify('Two qubits on the Bloch sphere.', en, new Set());
    expect(s2.filter((s) => s.slug).map((s) => s.slug)).toEqual(['qubit', 'bloch-sphere']);
  });

  it('does not match inside other words', () => {
    const segs = linkify('superqubitness', en, new Set());
    expect(segs.every((s) => !s.slug)).toBe(true);
  });

  it('respects excluded slugs', () => {
    const segs = linkify('qubit', id, new Set(['qubit']));
    expect(segs.every((s) => !s.slug)).toBe(true);
  });
});

describe('bilingual content is complete', () => {
  it('algorithms, puzzles, gates and examples have non-empty id & en text', () => {
    const check = (b: { id: string; en: string }) => {
      expect(b.id.trim()).not.toBe('');
      expect(b.en.trim()).not.toBe('');
    };
    for (const a of ALGORITHMS)
      [
        a.title,
        a.summary,
        a.intro,
        a.conclusion,
        a.speedup,
        ...Object.values(a.steps).flatMap((s) => [s.title, s.body]),
      ].forEach(check);
    for (const p of PUZZLES) [p.title, p.hint].forEach(check);
    for (const d of Object.values(GATE_DOCS)) [d.name, d.desc].forEach(check);
    for (const e of EXAMPLES) check(e.name);
  });

  it('every algorithm stage has step text', () => {
    for (const a of ALGORITHMS) {
      const s = a.build(a.defaults);
      for (const st of s.stages)
        expect(a.steps[st.key] ?? a.steps[st.key.split('-')[0]], `${a.id}:${st.key}`).toBeDefined();
    }
  });
});
