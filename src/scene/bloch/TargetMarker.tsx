import { useMemo } from 'react';
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  MeshStandardNodeMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three/webgpu';
import type { Vec3 } from '@/lib/quantum/bloch';
import { blochToThree } from '../coords';
import { useScenePreset } from '../theme';

/** Translucent "ghost" arrow + halo ring marking a target Bloch vector (puzzles). */
export function TargetMarker({ v, radius = 1 }: { v: Vec3; radius?: number }) {
  const preset = useScenePreset();
  const { shaft, head, ring, mat, ringMat, quat, len, tip } = useMemo(() => {
    const p = blochToThree(v).multiplyScalar(radius);
    const len = Math.max(0.001, p.length());
    const dir = len > 0.001 ? p.clone().normalize() : new Vector3(0, 1, 0);
    const color = new Color(preset.glow);
    const mat = new MeshStandardNodeMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      roughness: 0.4,
    });
    mat.emissive = color.clone();
    mat.emissiveIntensity = 0.8;
    const ringMat = new MeshStandardNodeMaterial({ color });
    ringMat.emissive = color.clone();
    ringMat.emissiveIntensity = 1.6;
    return {
      shaft: new CylinderGeometry(0.022, 0.022, 1, 12).translate(0, 0.5, 0),
      head: new ConeGeometry(0.06, 0.14, 20).translate(0, -0.07, 0),
      ring: new TorusGeometry(0.12, 0.012, 8, 48),
      mat,
      ringMat,
      quat: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir),
      len,
      tip: p,
    };
  }, [v, radius, preset]);
  const ringQuat = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), tip.clone().normalize()),
    [tip],
  );
  return (
    <group>
      <group quaternion={quat}>
        <mesh geometry={shaft} material={mat} scale={[1, Math.max(0.001, len - 0.14), 1]} renderOrder={7} />
        <mesh geometry={head} material={mat} position={[0, len, 0]} renderOrder={7} />
      </group>
      <mesh geometry={ring} material={ringMat} position={tip} quaternion={ringQuat} />
    </group>
  );
}
