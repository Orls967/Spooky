import { useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { useSceneStore } from '@/store/scene';

/**
 * Orbit controls + cinematic dolly-in on mount. With `fitRadius`, the camera distance adapts to the canvas
 * aspect ratio so a bounding sphere of that radius always fits (phones get pulled back automatically).
 */
export function CameraRig({
  target = [0, 0, 0],
  minDistance = 2.4,
  maxDistance = 9,
  intro = true,
  autoRotate = false,
  fitRadius,
}: {
  target?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  intro?: boolean;
  autoRotate?: boolean;
  fitRadius?: number;
}) {
  const camera = useThree((s) => s.camera) as unknown as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const poke = useSceneStore((s) => s.poke);
  const introDone = useRef(false);
  const tween = useRef<gsap.core.Tween | null>(null);
  const t = new Vector3(...target);

  // distance that fits the bounding sphere for the current aspect
  const fitDistance = (): number | null => {
    if (!fitRadius || !size.width || !size.height) return null;
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (size.width / size.height));
    return fitRadius / Math.sin(Math.min(vfov, hfov) / 2);
  };

  useLayoutEffect(() => {
    const d = fitDistance();
    const dir = camera.position.clone().sub(t).normalize();
    const end = d
      ? t.clone().addScaledVector(dir, Math.min(Math.max(d, minDistance), maxDistance))
      : camera.position.clone();
    if (!introDone.current && intro && !prefersReducedMotion()) {
      introDone.current = true;
      const start = end
        .clone()
        .addScaledVector(dir, 2.2)
        .add(new Vector3(0, 0.6, 0));
      camera.position.copy(start);
      tween.current = gsap.to(camera.position, {
        x: end.x,
        y: end.y,
        z: end.z,
        duration: 1.8,
        ease: 'expo.out',
        onUpdate: () => {
          camera.lookAt(t);
          invalidate();
        },
      });
    } else if (d) {
      introDone.current = true;
      tween.current?.kill();
      camera.position.copy(end);
      camera.lookAt(t);
      invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, fitRadius]);

  useEffect(() => () => void tween.current?.kill(), []);

  return (
    <OrbitControls
      makeDefault
      target={target}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={autoRotate}
      autoRotateSpeed={0.4}
      onChange={() => {
        poke();
        invalidate();
      }}
    />
  );
}
