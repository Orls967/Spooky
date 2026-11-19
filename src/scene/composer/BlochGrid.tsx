import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { Vec3 } from '@/lib/quantum/bloch';
import { BlochSphere } from '../bloch/BlochSphere';
import { BlochAnimator } from '../bloch/BlochAnimator';

const RADIUS = 0.62;

/** One small Bloch sphere per qubit showing its reduced state. */
export function BlochGrid({ vectors }: { vectors: Vec3[] }) {
  const n = vectors.length;
  const animators = useMemo(() => Array.from({ length: n }, () => new BlochAnimator([0, 0, 1])), [n]);
  useEffect(() => () => animators.forEach((a) => a.dispose()), [animators]);
  useEffect(() => {
    vectors.forEach((v, i) => animators[i]?.moveTo(v, 0.55));
  }, [vectors, animators]);
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  const gap = RADIUS * 2.9;
  return (
    <group>
      {animators.map((a, i) => {
        const r = Math.floor(i / perRow),
          c = i % perRow;
        const rowsTotal = Math.ceil(n / perRow);
        const x = (c - (perRow - 1) / 2) * gap;
        const y = ((rowsTotal - 1) / 2 - r) * gap * 0.95;
        return (
          <BlochSphere key={i} animator={a} radius={RADIUS} position={[x, y, 0]} labels={false} floor={false}>
            <Html position={[0, -RADIUS * 1.32, 0]} center className="pointer-events-none select-none">
              <span className="num text-xs text-muted-foreground">q{i}</span>
            </Html>
          </BlochSphere>
        );
      })}
    </group>
  );
}

export function blochGridRadius(n: number): number {
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  return Math.max((perRow * RADIUS * 2.9) / 2, (rows * RADIUS * 2.9) / 2) * 0.95 + 0.3;
}
