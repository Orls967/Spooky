import { Vector3 } from 'three/webgpu';
import type { Vec3 } from '@/lib/quantum/bloch';

/**
 * Bloch (x, y, z) → three.js world. z (|0⟩) points up (+Y), x (|+⟩) to +X, y (|+i⟩) to −Z.
 * The map has determinant +1 so rotations keep their handedness.
 */
export function blochToThree(v: Vec3, out = new Vector3()): Vector3 {
  return out.set(v[0], v[2], -v[1]);
}

export function threeToBloch(v: Vector3): Vec3 {
  return [v.x, -v.z, v.y];
}
