import { useMemo } from 'react';
import { AdditiveBlending, InstancedBufferAttribute, NormalBlending, Sprite, SpriteNodeMaterial } from 'three/webgpu';
import { color, float, fract, instancedBufferAttribute, sin, time, vec3 } from 'three/tsl';
import { softDot } from './tslUtils';
import { useScenePreset } from './theme';
import { useSceneStore } from '@/store/scene';

/** Soft dust motes drifting through the "room" — pure GPU animation (TSL), no per-frame JS. */
export function AmbientDust({ spread = 7, count: requested = 420 }: { spread?: number; count?: number }) {
  const preset = useScenePreset();
  const quality = useSceneStore((s) => s.quality);
  const count = quality === 'low' ? 0 : quality === 'medium' ? Math.round(requested * 0.5) : requested;

  const sprite = useMemo(() => {
    if (count === 0) return null;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = (Math.random() - 0.5) * spread;
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = (Math.random() - 0.5) * spread;
      seeds[i * 4 + 3] = Math.random();
    }
    const a = instancedBufferAttribute(new InstancedBufferAttribute(seeds, 4), 'vec4' as const);
    const m = new SpriteNodeMaterial({ transparent: true, depthWrite: false });
    m.blending = preset.name === 'dark' ? AdditiveBlending : NormalBlending;
    // rise slowly and wrap around vertically
    const yy = fract(a.y.add(time.mul(a.w.mul(0.012).add(0.004))))
      .sub(0.5)
      .mul(spread * 0.6);
    m.positionNode = vec3(a.x.add(sin(time.mul(0.2).add(a.w.mul(20))).mul(0.15)), yy, a.z);
    m.scaleNode = float(0.01).add(a.w.mul(0.016));
    m.colorNode = color(preset.name === 'dark' ? preset.particles : '#8a7a63');
    // fade near the wrap edges
    const edge = fract(a.y.add(time.mul(a.w.mul(0.012).add(0.004))));
    m.opacityNode = edge
      .mul(float(1).sub(edge))
      .mul(4)
      .mul(preset.name === 'dark' ? 0.5 : 0.35)
      .mul(softDot());
    const s = new Sprite(m);
    s.count = count;
    s.frustumCulled = false;
    return s;
  }, [count, spread, preset]);

  if (!sprite) return null;
  return <primitive object={sprite} />;
}
