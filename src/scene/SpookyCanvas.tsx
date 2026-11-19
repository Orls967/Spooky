import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Canvas, extend, type GLProps } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import { useTranslation } from 'react-i18next';
import { MonitorX } from 'lucide-react';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { useSettings } from '@/store/settings';
import { IS_MOBILE, useSceneStore } from '@/store/scene';
import { cn } from '@/lib/utils';
import { createRenderer, DEVICE_LOST_EVENT, detectGraphics, isSoftwareRenderer, rendererBackend } from './graphics';
import { SceneEnvironment } from './SceneEnvironment';
import { PostFX } from './PostFX';
import { AmbientTicker } from './AmbientTicker';

type DefaultGLProps = Parameters<Extract<GLProps, (p: never) => Promise<unknown>>>[0];

// Register the WebGPU build (node materials etc.) as JSX elements.
extend(THREE as unknown as Parameters<typeof extend>[0]);

export interface SpookyCanvasProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  className?: string;
  /** enable depth-of-field (focus moments) */
  dof?: boolean;
  /** keep rendering continuously (e.g. scroll-driven intro); otherwise demand + ambient ticker */
  alwaysRender?: boolean;
  /** accessible description of what the scene shows */
  label: string;
  /** hide the environment map lighting (rarely needed) */
  noEnvironment?: boolean;
  /** stop rendering entirely (e.g. scrolled out of view) */
  paused?: boolean;
}

export function SpookyCanvas({
  children,
  cameraPosition = [3.9, 1.7, -1.35],
  fov = 38,
  className,
  dof,
  alwaysRender,
  label,
  noEnvironment,
  paused = false,
}: SpookyCanvasProps) {
  const support = detectGraphics();
  const lowPower = useSettings((s) => s.lowPower);
  const quality = useSceneStore((s) => s.quality);
  const setQuality = useSceneStore((s) => s.setQuality);
  const setBackend = useSceneStore((s) => s.setBackend);
  const poke = useSceneStore((s) => s.poke);
  const [dpr, setDpr] = useState<number>(() => Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.5 : 2));
  const effective = lowPower ? 'low' : quality;
  // bumped when the WebGPU device is lost → remount the canvas on the WebGL2 backend
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const onLost = () => setGeneration((g) => g + 1);
    window.addEventListener(DEVICE_LOST_EVENT, onLost);
    return () => window.removeEventListener(DEVICE_LOST_EVENT, onLost);
  }, []);

  const gl = useCallback(
    async (props: DefaultGLProps) => {
      const r = await createRenderer(props.canvas as HTMLCanvasElement);
      setBackend(rendererBackend(r));
      return r;
    },
    [setBackend],
  );

  if (support === 'none') return <SceneFallback className={className} />;

  return (
    <div
      className={cn('relative isolate overflow-hidden', className)}
      role="img"
      aria-label={label}
      onPointerDown={poke}
      onPointerMove={poke}
      onWheel={poke}
    >
      <ErrorBoundary fallback={() => <SceneFallback className="absolute inset-0" />}>
        <Canvas
          key={generation}
          gl={gl}
          dpr={isSoftwareRenderer() ? 0.75 : lowPower || effective === 'low' ? 1 : dpr}
          frameloop={paused ? 'never' : alwaysRender ? 'always' : 'demand'}
          camera={{ fov, near: 0.05, far: 100, position: cameraPosition }}
          className="!absolute inset-0 touch-none"
        >
          {!lowPower && (
            <PerformanceMonitor
              bounds={() => (IS_MOBILE ? [28, 55] : [45, 58])}
              onIncline={() => {
                setDpr((d) => Math.min(d + 0.25, Math.min(window.devicePixelRatio || 1, 2)));
                if (quality === 'medium' && !IS_MOBILE) setQuality('high');
              }}
              onDecline={() => {
                setDpr((d) => Math.max(1, d - 0.25));
                if (quality === 'high') setQuality('medium');
                else if (quality === 'medium') setQuality('low');
              }}
              flipflops={4}
            />
          )}
          <Suspense fallback={null}>
            {!noEnvironment && <SceneEnvironment />}
            {children}
          </Suspense>
          <PostFX quality={effective} dof={dof && effective === 'high'} />
          {!alwaysRender && <AmbientTicker />}
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

export function SceneFallback({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex max-w-sm flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <MonitorX className="size-8" />
        <p>{t('errors.webgl')}</p>
      </div>
    </div>
  );
}
