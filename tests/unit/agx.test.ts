import { describe, expect, it } from 'vitest';
import { agx, inverseAgx, srgbHexToLinear } from '@/scene/agx';

describe('AgX inverse (background colour compensation)', () => {
  it.each(['#f9f5ed', '#e9e1d2', '#141b2b', '#07090f'])('round-trips %s', (hex) => {
    const target = srgbHexToLinear(hex);
    const out = agx(inverseAgx(target, 0.92), 0.92);
    for (let i = 0; i < 3; i++) expect(out[i]).toBeCloseTo(target[i], 3);
  });
});
