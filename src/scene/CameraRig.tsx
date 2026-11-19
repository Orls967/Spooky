import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import { Vector3 } from 'three/webgpu';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { useSceneStore } from '@/store/scene';

/** Orbit controls + a cinematic dolly-in on mount. */
export function CameraRig({
  target = [0, 0, 0],
  minDistance = 2.4,
  maxDistance = 8,
  intro = true,
  autoRotate = false,
}: {
  target?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  intro?: boolean;
  autoRotate?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const poke = useSceneStore((s) => s.poke);

  useEffect(() => {
    if (!intro || prefersReducedMotion()) return;
    const end = camera.position.clone();
    const dir = end
      .clone()
      .sub(new Vector3(...target))
      .normalize();
    const start = end
      .clone()
      .add(dir.multiplyScalar(2.2))
      .add(new Vector3(0, 0.6, 0));
    camera.position.copy(start);
    const tw = gsap.to(camera.position, {
      x: end.x,
      y: end.y,
      z: end.z,
      duration: 1.8,
      ease: 'expo.out',
      onUpdate: () => {
        camera.lookAt(...target);
        invalidate();
      },
    });
    return () => {
      tw.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
