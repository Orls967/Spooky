import { useMemo } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicNodeMaterial,
  LineSegments,
  MeshStandardNodeMaterial,
  SphereGeometry,
} from 'three/webgpu';
import { blochToThree } from '../coords';

/**
 * A measurement direction drawn through a Bloch sphere: measuring "at angle θ" in the x–z plane
 * (observable cos θ Z + sin θ X). Outcome 0 ↔ +direction, 1 ↔ −direction.
 */
export function MeasureAxis({
  theta,
  radius = 1,
  color = '#7fb7ff',
  visible = true,
}: {
  theta: number;
  radius?: number;
  color?: string;
  visible?: boolean;
}) {
  const { line, dotGeo, dotMat } = useMemo(() => {
    const d = blochToThree([Math.sin(theta), 0, Math.cos(theta)]).multiplyScalar(radius * 1.12);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(Float32Array.of(-d.x, -d.y, -d.z, d.x, d.y, d.z), 3));
    const m = new LineBasicNodeMaterial({
      color: new Color(color),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const dotMat = new MeshStandardNodeMaterial({ color: new Color(color) });
    dotMat.emissive = new Color(color);
    dotMat.emissiveIntensity = 1.6;
    return { line: new LineSegments(g, m), dotGeo: new SphereGeometry(0.03, 16, 10), dotMat };
  }, [theta, radius, color]);
  const tip = blochToThree([Math.sin(theta), 0, Math.cos(theta)]).multiplyScalar(radius * 1.12);
  return (
    <group visible={visible}>
      <primitive object={line} />
      <mesh geometry={dotGeo} material={dotMat} position={tip} />
    </group>
  );
}
