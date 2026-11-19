import { float, uv } from 'three/tsl';

/** Round, soft-edged sprite mask (1 in the centre → 0 at the rim) — turns square sprites into glowing dots. */
export function softDot(hardness = 0.15) {
  const d = uv().sub(0.5).length().mul(2);
  return float(1).sub(d.smoothstep(hardness, 1)).pow(1.6);
}
