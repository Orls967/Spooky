import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedMesh,
  LineBasicNodeMaterial,
  LineSegments,
  Matrix4,
  MeshStandardNodeMaterial,
  SphereGeometry,
  TorusGeometry,
  MeshBasicNodeMaterial,
  Vector3,
} from 'three/webgpu';
import { basisLabel, hammingWeight } from '@/lib/quantum/statevector';
import { useScenePreset } from '../theme';
import { stepSmoothed, useSmoothedState } from './useSmoothedState';

const R = 1.35;

/** Position of every basis state on the Q-sphere: latitude by Hamming weight, spread evenly in longitude. */
export function qspherePositions(n: number): Vector3[] {
  const dim = 1 << n;
  const groups: number[][] = Array.from({ length: n + 1 }, () => []);
  for (let i = 0; i < dim; i++) groups[hammingWeight(i)].push(i);
  const out: Vector3[] = new Array(dim);
  groups.forEach((g, w) => {
    const theta = (Math.PI * w) / n;
    g.forEach((i, j) => {
      const phi = (2 * Math.PI * j) / g.length + (w % 2) * (Math.PI / g.length);
      out[i] = new Vector3(
        Math.sin(theta) * Math.cos(phi) * R,
        Math.cos(theta) * R,
        Math.sin(theta) * Math.sin(phi) * R,
      );
    });
  });
  return out;
}

export function QSphere({ n, amplitudes }: { n: number; amplitudes: Float64Array }) {
  const preset = useScenePreset();
  const dim = 1 << n;
  const pos = useMemo(() => qspherePositions(n), [n]);
  const smooth = useSmoothedState(amplitudes, dim);
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useRef<InstancedMesh>(null);

  const { geo, mat, spokes, rings, ringMat, shell } = useMemo(() => {
    const geo = new SphereGeometry(1, 24, 16);
    const mat = new MeshStandardNodeMaterial({ roughness: 0.25, metalness: 0.05 });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(dim * 6), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(dim * 6), 3));
    const spokes = new LineSegments(
      g,
      new LineBasicNodeMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    const ringMat = new MeshBasicNodeMaterial({
      color: new Color(preset.line),
      transparent: true,
      opacity: preset.lineOpacity,
      depthWrite: false,
    });
    const rings = Array.from({ length: Math.max(0, n - 1) }, (_, k) => {
      const th = (Math.PI * (k + 1)) / n;
      return { r: Math.sin(th) * R, y: Math.cos(th) * R, geo: new TorusGeometry(Math.sin(th) * R, 0.004, 6, 160) };
    });
    const shell = new MeshStandardNodeMaterial({
      color: new Color(preset.glass.tint),
      transparent: true,
      opacity: preset.name === 'dark' ? 0.06 : 0.12,
      roughness: 0.1,
      depthWrite: false,
    });
    return { geo, mat, spokes, rings, ringMat, shell };
  }, [dim, n, preset]);

  useEffect(
    () => () => {
      geo.dispose();
      spokes.geometry.dispose();
      rings.forEach((r) => r.geo.dispose());
    },
    [geo, spokes, rings],
  );

  const m4 = useMemo(() => new Matrix4(), []);
  const col = useMemo(() => new Color(), []);
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const moving = stepSmoothed(smooth, 0.14);
    const sp = spokes.geometry.getAttribute('position') as BufferAttribute;
    const sc = spokes.geometry.getAttribute('color') as BufferAttribute;
    for (let i = 0; i < dim; i++) {
      const p = smooth.p[i];
      const s = p > 1e-4 ? 0.035 + 0.16 * Math.sqrt(p) : 0.014;
      m4.makeScale(s, s, s).setPosition(pos[i]);
      im.setMatrixAt(i, m4);
      if (p > 1e-4) col.setRGB(smooth.rgb[3 * i], smooth.rgb[3 * i + 1], smooth.rgb[3 * i + 2]);
      else col.set(preset.line).multiplyScalar(0.7);
      im.setColorAt(i, col);
      const k = p > 1e-4 ? 1 : 0;
      sp.setXYZ(2 * i, 0, 0, 0);
      sp.setXYZ(2 * i + 1, pos[i].x * k, pos[i].y * k, pos[i].z * k);
      sc.setXYZ(2 * i, col.r * 0.3, col.g * 0.3, col.b * 0.3);
      sc.setXYZ(2 * i + 1, col.r, col.g, col.b);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    sp.needsUpdate = true;
    sc.needsUpdate = true;
    if (moving) invalidate();
  });

  const labels = useMemo(
    () =>
      Array.from({ length: dim }, (_, i) => i)
        .filter((i) => smooth.tp[i] > 0.015)
        .sort((a, b) => smooth.tp[b] - smooth.tp[a])
        .slice(0, 14),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amplitudes, dim],
  );

  return (
    <group>
      <mesh material={shell} renderOrder={1}>
        <sphereGeometry args={[R, 64, 32]} />
      </mesh>
      {rings.map((r, k) => (
        <mesh key={k} geometry={r.geo} material={ringMat} position={[0, r.y, 0]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
      <primitive object={spokes} />
      <instancedMesh key={dim} ref={mesh} args={[geo, mat, dim]} />
      {labels.map((i) => (
        <Html
          key={i}
          position={pos[i].clone().multiplyScalar(1.17)}
          center
          zIndexRange={[5, 0]}
          className="pointer-events-none select-none"
        >
          <span className="num text-[0.62rem] whitespace-nowrap text-foreground/80">|{basisLabel(i, n)}⟩</span>
        </Html>
      ))}
    </group>
  );
}
