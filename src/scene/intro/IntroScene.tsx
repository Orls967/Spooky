import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, PerspectiveCamera } from 'three/webgpu';
import { BlochSphere } from '../bloch/BlochSphere';
import { BlochAnimator } from '../bloch/BlochAnimator';
import { GhostThread } from '../spooky/GhostThread';
import { ThreadController } from '../spooky/ThreadController';
import { Coin, type CoinState } from './Coin';
import type { Vec3 } from '@/lib/quantum/bloch';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Scroll-driven story: coin → qubit → superposition → measurement → entanglement.
 * `progress.current` ∈ [0, 5] is written by GSAP ScrollTrigger; everything here is a pure function of it,
 * so scrolling back plays the story in reverse.
 */
export function IntroScene({
  progress,
  reduced,
  labels,
}: {
  progress: React.RefObject<number>;
  reduced: boolean;
  labels: boolean;
}) {
  // on wide screens shift the projected centre right, leaving room for the captions on the left
  const camera = useThree((s) => s.camera) as unknown as PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    const wide = size.width / size.height > 1.15;
    if (wide) camera.setViewOffset(size.width, size.height, -size.width * 0.17, 0, size.width, size.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  const a = useMemo(() => new BlochAnimator([0, 0, 1]), []);
  const b = useMemo(() => new BlochAnimator([0, 0, 0]), []);
  const thread = useMemo(() => {
    const t = new ThreadController();
    t.strength = 0;
    return t;
  }, []);
  useEffect(
    () => () => {
      a.dispose();
      b.dispose();
    },
    [a, b],
  );
  const coin = useRef<CoinState>({ morph: 0, opacity: 1, spin: 2.6 });
  const gA = useRef<Group>(null);
  const gB = useRef<Group>(null);
  const gThread = useRef<Group>(null);
  const last = useRef<Vec3>([0, 0, 1]);

  useFrame(() => {
    const p = progress.current ?? 0;
    // 1 — coin spins, then morphs into a sphere
    coin.current.morph = smooth(0.85, 1.7, p);
    coin.current.opacity = 1 - smooth(1.55, 1.95, p);
    coin.current.spin = reduced ? 0 : 2.6 * (1 - smooth(0.6, 1.6, p)) + 0.15;
    const show = smooth(1.45, 1.95, p);
    // 5 — split into an entangled pair
    const pair = smooth(4.05, 4.8, p);
    if (gA.current) {
      gA.current.visible = show > 0.001;
      gA.current.scale.setScalar(0.6 + 0.4 * show - 0.22 * pair);
      gA.current.position.x = -1.7 * pair;
    }
    if (gB.current) {
      gB.current.visible = pair > 0.001;
      gB.current.scale.setScalar(Math.max(0.001, 0.78 * pair));
      gB.current.position.x = 1.7 * pair;
    }
    if (gThread.current) gThread.current.visible = pair > 0.6;
    thread.strength = smooth(4.5, 4.95, p);

    // arrow: |0⟩ → |+⟩ (superposition) → collapse to |1⟩ (measurement) → shrinks (entangled)
    let v: Vec3;
    if (p < 2.1) v = [0, 0, 1];
    else if (p < 3.0) {
      const th = (Math.PI / 2) * smooth(2.1, 2.9, p);
      v = [Math.sin(th), 0, Math.cos(th)];
    } else if (p < 3.55) v = [1, 0, 0];
    else if (p < 4.1) {
      const th = Math.PI / 2 + (Math.PI / 2) * smooth(3.55, 3.75, p);
      v = [Math.sin(th), 0, Math.cos(th)];
    } else {
      // pair: each qubit alone is maximally mixed
      const k = 1 - smooth(4.4, 4.95, p);
      v = [0, 0, -k];
    }
    a.flash = Math.max(0, 1 - Math.abs(p - 3.7) * 6);
    if (v.some((x, i) => Math.abs(x - last.current[i]) > 1e-4)) {
      a.set(v);
      last.current = v;
    }
  });

  return (
    <group>
      <Coin state={coin} />
      <group ref={gA}>
        <BlochSphere animator={a} labels={labels ? 'poles' : false} floor={false} />
      </group>
      <group ref={gB}>
        <BlochSphere animator={b} labels={false} floor={false} />
      </group>
      <group ref={gThread}>
        <GhostThread from={[-1.7 + 0.76, 0.05, 0]} to={[1.7 - 0.76, 0.05, 0]} controller={thread} />
      </group>
    </group>
  );
}
