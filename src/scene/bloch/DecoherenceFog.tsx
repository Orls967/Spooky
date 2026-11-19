import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, InstancedBufferAttribute, NormalBlending, Sprite, SpriteNodeMaterial } from 'three/webgpu';
import { color, float, instancedBufferAttribute, sin, time, uniform, vec3, cos, mx_noise_float } from 'three/tsl';
import { softDot } from '../tslUtils';
import { useScenePreset } from '../theme';
import { useSceneStore } from '@/store/scene';

/**
 * "Mist" inside the Bloch sphere that thickens as the state becomes mixed (|r| shrinks).
 * Instanced sprites; positions swirl on the GPU with TSL (time + simplex noise), opacity ∝ mixedness.
 */
export function DecoherenceFog({ amount, radius = 1 }: { amount: number | (() => number); radius?: number }) {
  const preset = useScenePreset();
  const quality = useSceneStore((s) => s.quality);
  const count = quality === 'high' ? 1400 : quality === 'medium' ? 700 : 300;
  const invalidate = useThree((s) => s.invalidate);

  const { sprite, uAmount } = useMemo(() => {
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // uniform in ball: r = cbrt(u)
      const u = Math.random(),
        v = Math.random(),
        w = Math.random();
      const r = Math.cbrt(u) * 0.93 * radius;
      const th = Math.acos(2 * v - 1),
        ph = 2 * Math.PI * w;
      seeds[i * 4] = r * Math.sin(th) * Math.cos(ph);
      seeds[i * 4 + 1] = r * Math.cos(th);
      seeds[i * 4 + 2] = r * Math.sin(th) * Math.sin(ph);
      seeds[i * 4 + 3] = Math.random();
    }
    const attr = instancedBufferAttribute(new InstancedBufferAttribute(seeds, 4), 'vec4' as const);
    const uAmount = uniform(0);
    const m = new SpriteNodeMaterial({ transparent: true, depthWrite: false });
    m.blending = preset.name === 'dark' ? AdditiveBlending : NormalBlending;
    const base = attr.xyz;
    const rnd = attr.w;
    // slow swirl around the vertical axis + noise wobble
    const ang = time.mul(rnd.mul(0.25).add(0.08));
    const swirl = vec3(
      base.x.mul(cos(ang)).sub(base.z.mul(sin(ang))),
      base.y.add(sin(time.mul(0.6).add(rnd.mul(6.283))).mul(0.03)),
      base.x.mul(sin(ang)).add(base.z.mul(cos(ang))),
    );
    const wobble = mx_noise_float(swirl.mul(2.2).add(time.mul(0.15))).mul(0.06);
    m.positionNode = swirl.add(wobble);
    m.scaleNode = float(0.03).add(rnd.mul(0.035)).mul(uAmount.mul(0.6).add(0.4));
    m.colorNode = color(preset.particles);
    const flicker = sin(time.mul(1.7).add(rnd.mul(40)))
      .mul(0.25)
      .add(0.75);
    m.opacityNode = uAmount.mul(preset.particleOpacity).mul(flicker).mul(softDot());
    const s = new Sprite(m);
    s.count = count;
    s.frustumCulled = false;
    return { sprite: s, uAmount };
  }, [count, preset, radius]);

  useEffect(() => () => sprite.material.dispose(), [sprite]);

  useFrame(() => {
    // ease towards the target amount
    const target = Math.max(0, Math.min(1, typeof amount === 'function' ? amount() : amount));
    const cur = uAmount.value as number;
    const next = cur + (target - cur) * 0.08;
    uAmount.value = Math.abs(next - target) < 0.002 ? target : next;
    sprite.visible = (uAmount.value as number) > 0.003;
    if (uAmount.value !== target || sprite.visible) invalidate();
  });

  return <primitive object={sprite} />;
}
