import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, Color, Mesh, MeshStandardNodeMaterial, SphereGeometry } from 'three/webgpu';
import { attribute, color, mix, uniform } from 'three/tsl';
import { useScenePreset } from '../theme';

/**
 * A coin built from a sphere's vertices so it can morph back into a sphere (morph target):
 * flat faces facing ±z, straight rim. Faces are two-tone (TSL, per-vertex "face" attribute).
 */
function makeCoinSphere() {
  const geo = new SphereGeometry(1, 128, 96);
  geo.rotateX(Math.PI / 2); // sphere poles on ±z → coin faces on ±z
  const sphere = geo.getAttribute('position').array as Float32Array;
  const coin = new Float32Array(sphere.length);
  const face = new Float32Array(sphere.length / 3);
  const R = 1.05,
    H = 0.085,
    band = 0.28;
  for (let i = 0; i < sphere.length; i += 3) {
    const x = sphere[i],
      y = sphere[i + 1],
      z = sphere[i + 2];
    const rxy = Math.hypot(x, y);
    const rimR = Math.sqrt(1 - band * band);
    const radial = R * Math.min(1, rxy / rimR);
    coin[i] = rxy > 1e-6 ? (x / rxy) * radial : 0;
    coin[i + 1] = rxy > 1e-6 ? (y / rxy) * radial : 0;
    coin[i + 2] = Math.sign(z) * H * Math.min(1, Math.abs(z) / band);
    face[i / 3] = Math.abs(z) < band * 0.98 ? 0 : z > 0 ? 1 : -1;
  }
  geo.setAttribute('position', new BufferAttribute(coin, 3));
  geo.computeVertexNormals();
  const sphereNormals = new BufferAttribute(new Float32Array(sphere), 3);
  geo.morphAttributes.position = [new BufferAttribute(new Float32Array(sphere), 3)];
  geo.morphAttributes.normal = [sphereNormals];
  geo.setAttribute('face', new BufferAttribute(face, 1));
  return geo;
}

export interface CoinState {
  /** 0 = coin, 1 = sphere */
  morph: number;
  opacity: number;
  spin: number;
}

export function Coin({ state }: { state: React.RefObject<CoinState> }) {
  const preset = useScenePreset();
  const mesh = useRef<Mesh>(null);
  const geo = useMemo(() => makeCoinSphere(), []);
  const { mat, uOpacity } = useMemo(() => {
    const uOpacity = uniform(1);
    const m = new MeshStandardNodeMaterial({ metalness: 0.92, roughness: 0.26, transparent: true });
    const f = attribute<'float'>('face', 'float');
    const gold = color(new Color(preset.name === 'dark' ? '#e7b04c' : '#c2862f'));
    const silver = color(new Color(preset.name === 'dark' ? '#c9d2e4' : '#a8aebb'));
    const rim = color(new Color(preset.name === 'dark' ? '#b08a3e' : '#8d6a2a'));
    m.colorNode = mix(mix(silver, gold, f.mul(0.5).add(0.5)), rim, f.abs().oneMinus());
    m.opacityNode = uOpacity;
    return { mat: m, uOpacity };
  }, [preset]);

  useFrame((_, dt) => {
    const m = mesh.current;
    const s = state.current;
    if (!m || !s) return;
    m.morphTargetInfluences![0] = s.morph;
    uOpacity.value = s.opacity;
    m.visible = s.opacity > 0.01;
    m.rotation.y += dt * s.spin;
    m.rotation.x = 0.35 * (1 - s.morph);
  });

  return <mesh ref={mesh} geometry={geo} material={mat} morphTargetInfluences={[0]} castShadow />;
}
