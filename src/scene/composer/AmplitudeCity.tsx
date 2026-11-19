import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedMesh,
  LineBasicNodeMaterial,
  LineSegments,
  Matrix4,
  MeshStandardNodeMaterial,
  Vector3,
} from 'three/webgpu';
import { basisLabel } from '@/lib/quantum/statevector';
import { fmtComplex, fmtPct } from '@/lib/format';
import { useScenePreset } from '../theme';
import { stepSmoothed, useSmoothedState } from './useSmoothedState';

const SPACING = 0.46;
const FOOT = 0.32;
export const CITY_MAX_H = 2.3;
const MAX_H = CITY_MAX_H;

export function cityLayout(n: number) {
  const colsBits = Math.ceil(n / 2);
  const cols = 1 << colsBits;
  const rows = 1 << (n - colsBits);
  const pos = (i: number): [number, number] => {
    const r = i >> colsBits,
      c = i & (cols - 1);
    return [(c - (cols - 1) / 2) * SPACING, (r - (rows - 1) / 2) * SPACING];
  };
  return { cols, rows, pos, width: cols * SPACING, depth: rows * SPACING };
}

/** 3D bar chart of the state vector: one tower per basis state. Height = probability, colour = phase. */
export function AmplitudeCity({ n, amplitudes }: { n: number; amplitudes: Float64Array }) {
  const preset = useScenePreset();
  const dim = 1 << n;
  const layout = useMemo(() => cityLayout(n), [n]);
  const smooth = useSmoothedState(amplitudes, dim);
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useRef<InstancedMesh>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { geo, mat } = useMemo(() => {
    const geo = new BoxGeometry(FOOT, 1, FOOT).translate(0, 0.5, 0);
    const mat = new MeshStandardNodeMaterial({ roughness: 0.32, metalness: 0.08 });
    return { geo, mat };
  }, []);

  const plate = useMemo(() => {
    const w = layout.width + 0.3,
      d = layout.depth + 0.3;
    const g = new BufferGeometry();
    const pts: number[] = [];
    for (let c = 0; c <= layout.cols; c++) {
      const x = (c - layout.cols / 2) * SPACING;
      pts.push(x, 0, -layout.depth / 2, x, 0, layout.depth / 2);
    }
    for (let r = 0; r <= layout.rows; r++) {
      const z = (r - layout.rows / 2) * SPACING;
      pts.push(-layout.width / 2, 0, z, layout.width / 2, 0, z);
    }
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    const lines = new LineSegments(
      g,
      new LineBasicNodeMaterial({
        color: new Color(preset.line),
        transparent: true,
        opacity: preset.lineOpacity,
        depthWrite: false,
      }),
    );
    const slab = new MeshStandardNodeMaterial({ color: new Color(preset.floor), roughness: 0.55, metalness: 0.1 });
    return { lines, slabGeo: new BoxGeometry(w, 0.06, d).translate(0, -0.031, 0), slab };
  }, [layout, preset]);

  useEffect(() => () => geo.dispose(), [geo]);

  const m4 = useMemo(() => new Matrix4(), []);
  const col = useMemo(() => new Color(), []);
  const first = useRef(true);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const moving = first.current ? true : stepSmoothed(smooth, 0.14);
    if (first.current) {
      // start from flat ground, rise into place
      first.current = false;
    }
    for (let i = 0; i < dim; i++) {
      const [x, z] = layout.pos(i);
      const h = Math.max(0.004, smooth.p[i] * MAX_H);
      m4.makeScale(1, h, 1).setPosition(x, 0, z);
      im.setMatrixAt(i, m4);
      const faint = smooth.p[i] < 1e-4;
      col.setRGB(smooth.rgb[3 * i], smooth.rgb[3 * i + 1], smooth.rgb[3 * i + 2]);
      if (faint) col.set(preset.line).multiplyScalar(0.6);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    if (moving) invalidate();
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) setHover(e.instanceId);
  };

  const labels = useMemo(() => {
    const idx = Array.from({ length: dim }, (_, i) => i);
    if (n <= 4) return idx;
    return idx
      .filter((i) => smooth.tp[i] > 0.04)
      .sort((a, b) => smooth.tp[b] - smooth.tp[a])
      .slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim, n, amplitudes]);

  const hoverPos = hover !== null ? layout.pos(hover) : null;
  const re = hover !== null ? amplitudes[2 * hover] : 0,
    imv = hover !== null ? amplitudes[2 * hover + 1] : 0;

  return (
    <group position={[0, -0.9, 0]}>
      <mesh geometry={plate.slabGeo} material={plate.slab} />
      <primitive object={plate.lines} position={[0, 0.002, 0]} />
      <instancedMesh
        key={dim}
        ref={mesh}
        args={[geo, mat, dim]}
        castShadow
        onPointerMove={onMove}
        onPointerOut={() => setHover(null)}
      />
      {labels.map((i) => {
        const [x, z] = layout.pos(i);
        const atTop = n > 4;
        return (
          <Html
            key={i}
            position={
              atTop
                ? new Vector3(x, Math.max(0.05, smooth.tp[i] * MAX_H) + 0.18, z)
                : new Vector3(x, 0.02, z + FOOT * 0.9)
            }
            center
            zIndexRange={[5, 0]}
            className="pointer-events-none select-none"
          >
            <span className="num text-[0.62rem] whitespace-nowrap text-muted-foreground">|{basisLabel(i, n)}⟩</span>
          </Html>
        );
      })}
      {hover !== null && hoverPos && (
        <Html
          position={[hoverPos[0], Math.max(0.05, smooth.tp[hover] * MAX_H) + 0.35, hoverPos[1]]}
          center
          zIndexRange={[20, 10]}
        >
          <div className="panel pointer-events-none px-2.5 py-1.5 text-xs whitespace-nowrap">
            <div className="num font-medium">|{basisLabel(hover, n)}⟩</div>
            <div className="num text-muted-foreground">
              {fmtComplex(re, imv)} · {fmtPct(re * re + imv * imv)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
