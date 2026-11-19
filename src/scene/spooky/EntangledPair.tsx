import { Html } from '@react-three/drei';
import { BlochSphere } from '../bloch/BlochSphere';
import type { BlochAnimator } from '../bloch/BlochAnimator';
import { GhostThread } from './GhostThread';
import type { ThreadController } from './ThreadController';
import { MeasureAxis } from './MeasureAxis';
import { useScenePreset } from '../theme';

export const PAIR_X = 1.75;
export const PAIR_R = 0.78;

export function EntangledPair({
  alice,
  bob,
  thread,
  axisA,
  axisB,
  names,
}: {
  alice: BlochAnimator;
  bob: BlochAnimator;
  thread: ThreadController;
  /** measurement angle to display (null = hidden) */
  axisA: number | null;
  axisB: number | null;
  names: [string, string];
}) {
  const preset = useScenePreset();
  return (
    <group>
      <BlochSphere animator={alice} radius={PAIR_R} position={[-PAIR_X, 0, 0]} labels="poles" floor>
        {axisA !== null && <MeasureAxis theta={axisA} radius={PAIR_R} color={preset.glow} />}
        <Html position={[0, -PAIR_R * 1.75, 0]} center className="pointer-events-none select-none">
          <span className="eyebrow whitespace-nowrap !text-foreground">{names[0]}</span>
        </Html>
      </BlochSphere>
      <BlochSphere animator={bob} radius={PAIR_R} position={[PAIR_X, 0, 0]} labels="poles" floor>
        {axisB !== null && <MeasureAxis theta={axisB} radius={PAIR_R} color={preset.glow} />}
        <Html position={[0, -PAIR_R * 1.75, 0]} center className="pointer-events-none select-none">
          <span className="eyebrow whitespace-nowrap !text-foreground">{names[1]}</span>
        </Html>
      </BlochSphere>
      <GhostThread
        from={[-PAIR_X + PAIR_R * 0.98, 0.05, 0]}
        to={[PAIR_X - PAIR_R * 0.98, 0.05, 0]}
        controller={thread}
      />
    </group>
  );
}
