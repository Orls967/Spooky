import { describe, expect, it } from 'vitest';
import id from '@/i18n/locales/id';
import en from '@/i18n/locales/en';

type Tree = { [k: string]: string | Tree };

function flatten(obj: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

describe('i18n locales', () => {
  const fid = flatten(id as unknown as Tree);
  const fen = flatten(en as unknown as Tree);

  it('ID and EN have exactly the same keys', () => {
    const missingInEn = [...fid.keys()].filter((k) => !fen.has(k));
    const missingInId = [...fen.keys()].filter((k) => !fid.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInId).toEqual([]);
  });

  it('no empty strings', () => {
    for (const [k, v] of [...fid, ...fen]) expect(v.trim(), k).not.toBe('');
  });

  it('interpolation variables match between languages', () => {
    const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    for (const [k, v] of fid) expect(vars(fen.get(k) ?? ''), k).toEqual(vars(v));
  });
});
