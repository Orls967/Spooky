import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  MeshStandardNodeMaterial,
  NormalBlending,
  TubeGeometry,
  Vector3,
} from 'three/webgpu';
import {
  abs,
  color,
  exp,
  float,
  mx_noise_float,
  normalView,
  positionViewDirection,
  sin,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { useScenePreset } from '../theme';
import { useSceneStore } from '@/store/scene';
import type { ThreadController } from './ThreadController';

/** Helical strand around the base arc between a and b. */
function strandCurve(
  a: Vector3,
  b: Vector3,
  sag: number,
  twist: number,
  radius: number,
  phase: number,
): CatmullRomCurve3 {
  const pts: Vector3[] = [];
  const N = 64;
  const dir = b.clone().sub(a);
  const side = new Vector3(0, 0, 1);
  const up = new Vector3().crossVectors(side, dir).normalize();
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = a.clone().lerp(b, t);
    p.y += Math.sin(Math.PI * t) * sag;
    // envelope: strands converge at the ends
    const env = Math.sin(Math.PI * t) ** 0.7;
    const ang = phase + twist * Math.PI * 2 * t;
    p.addScaledVector(up, Math.cos(ang) * radius * env);
    p.addScaledVector(side, Math.sin(ang) * radius * env);
    pts.push(p);
  }
  return new CatmullRomCurve3(pts);
}

/**
 * The "spooky" thread: three twisting TSL-animated strands + a faint haze tube. Opacity follows the pair's
 * concurrence; a flash travels along it when one side is measured.
 */
export function GhostThread({
  from,
  to,
  controller,
}: {
  from: [number, number, number];
  to: [number, number, number];
  controller: ThreadController;
}) {
  const preset = useScenePreset();
  const quality = useSceneStore((s) => s.quality);
  const invalidate = useThree((s) => s.invalidate);

  const uniforms = useMemo(() => ({ strength: uniform(1), pulse: uniform(0), pulseAmp: uniform(0) }), []);

  const { geos, mats } = useMemo(() => {
    const a = new Vector3(...from),
      b = new Vector3(...to);
    const segs = quality === 'low' ? 80 : 160;
    const strands = [0, 1, 2].map(
      (k) => new TubeGeometry(strandCurve(a, b, 0.35, 2.5, 0.07, (k * Math.PI * 2) / 3), segs, 0.011, 8),
    );
    const haze = new TubeGeometry(strandCurve(a, b, 0.35, 0, 0, 0), segs, 0.085, 16);

    const glow = new Color(preset.glow);
    const dark = preset.name === 'dark';
    const make = (isHaze: boolean, offset: number) => {
      const m = new MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 1, metalness: 0 });
      m.blending = dark ? AdditiveBlending : NormalBlending;
      const u = uv();
      // flowing noise along the strand
      const flow = mx_noise_float(vec2(u.x.mul(7).sub(time.mul(0.55)).add(offset), u.y.mul(2).add(time.mul(0.15))))
        .mul(0.5)
        .add(0.5);
      // flash travelling along the thread
      const d = u.x.sub(uniforms.pulse);
      const flash = exp(d.mul(d).mul(-260)).mul(uniforms.pulseAmp);
      // view-facing core (brighter in the middle of the tube)
      const facing = abs(normalView.dot(positionViewDirection)).pow(isHaze ? 2.5 : 1.2);
      const shimmer = sin(time.mul(2.2).add(u.x.mul(18)).add(offset))
        .mul(0.15)
        .add(0.85);
      const base = isHaze ? float(0.18) : flow.mul(0.85).add(0.15).mul(shimmer);
      const alpha = base.mul(facing).mul(uniforms.strength).add(flash.mul(facing));
      m.colorNode = vec3(0, 0, 0);
      m.emissiveNode = color(glow)
        .mul(alpha.mul(dark ? 2.2 : 1.1))
        .add(vec3(1, 1, 1).mul(flash.mul(2.5)));
      m.opacityNode = alpha.mul(dark ? 1 : 1.9).clamp(0, 1);
      if (!dark) m.colorNode = color(glow).mul(0.75);
      return m;
    };
    return {
      geos: { strands, haze },
      mats: { strands: [0, 1, 2].map((k) => make(false, k * 2.1)), haze: make(true, 0) },
    };
  }, [from, to, preset, quality, uniforms]);

  useEffect(
    () => () => {
      geos.strands.forEach((g) => g.dispose());
      geos.haze.dispose();
    },
    [geos],
  );

  useEffect(() => controller.onChange(() => invalidate()), [controller, invalidate]);

  useFrame(() => {
    uniforms.strength.value = controller.strength;
    uniforms.pulse.value = controller.pulse;
    uniforms.pulseAmp.value = controller.pulseAmp;
  });

  return (
    <group>
      {geos.strands.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.strands[i]} renderOrder={5} />
      ))}
      <mesh geometry={geos.haze} material={mats.haze} renderOrder={4} />
    </group>
  );
}
