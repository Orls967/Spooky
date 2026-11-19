import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicNodeMaterial,
  LineSegments,
  Mesh,
  MeshBasicNodeMaterial,
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  NormalBlending,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Line,
  ConeGeometry,
  CircleGeometry,
} from 'three/webgpu';
import { attribute, color, float, normalView, positionViewDirection, uniform } from 'three/tsl';
import type { Vec3 } from '@/lib/quantum/bloch';
import { Tex } from '@/ui/Tex';
import { useScenePreset, type ScenePreset } from '../theme';
import { blochToThree } from '../coords';
import type { BlochAnimator } from './BlochAnimator';
import { useSceneStore } from '@/store/scene';
import { DecoherenceFog } from './DecoherenceFog';

const UP = new Vector3(0, 1, 0);

/** Fresnel rim shell — TSL: opacity ∝ (1 − |n·v|)³ */
function useRimMaterial(preset: ScenePreset) {
  return useMemo(() => {
    const m = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: DoubleSide });
    const strength = uniform(preset.name === 'dark' ? 0.55 : 0.75);
    const f = float(1).sub(normalView.dot(positionViewDirection).abs()).pow(3.0);
    m.colorNode = color(preset.name === 'dark' ? preset.glow : preset.line);
    m.opacityNode = f.mul(strength);
    m.blending = preset.name === 'dark' ? AdditiveBlending : NormalBlending;
    return m;
  }, [preset]);
}

export function GlassSphere({ radius = 1 }: { radius?: number }) {
  const preset = useScenePreset();
  const quality = useSceneStore((s) => s.quality);
  const geo = useMemo(() => new SphereGeometry(radius, 96, 64), [radius]);
  const glass = useMemo(() => {
    if (quality === 'low') {
      // no GPU budget: plain reflective shell, no clearcoat / iridescence / transmission
      return new MeshStandardNodeMaterial({
        color: new Color(preset.glass.tint),
        metalness: 0.1,
        roughness: 0.12,
        transparent: true,
        opacity: preset.name === 'dark' ? 0.14 : 0.28,
        depthWrite: false,
      });
    }
    const m = new MeshPhysicalNodeMaterial({
      color: new Color(preset.glass.tint),
      metalness: 0,
      roughness: preset.glass.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      iridescence: preset.glass.iridescence,
      iridescenceIOR: 1.32,
      iridescenceThicknessMinimum: 120,
      iridescenceThicknessMaximum: 420,
      ior: 1.46,
      specularIntensity: 1,
      envMapIntensity: 1.2,
    });
    if (quality === 'high') {
      m.transmission = 1;
      m.thickness = 0.25;
      m.attenuationColor = new Color(preset.glass.attenuation);
      m.attenuationDistance = 3;
    } else {
      // cheaper look-alike: reflective transparent shell
      m.transparent = true;
      m.opacity = preset.name === 'dark' ? 0.16 : 0.22;
      m.depthWrite = false;
    }
    return m;
  }, [preset, quality]);
  const rim = useRimMaterial(preset);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} material={glass} renderOrder={2} />
      <mesh geometry={geo} material={rim} scale={1.003} renderOrder={3} />
    </group>
  );
}

/** Latitude/longitude rings. Equator + prime meridians are thin tori (real geometry), the rest hairlines. */
export function SphereGrid({ radius = 1 }: { radius?: number }) {
  const preset = useScenePreset();
  const { lines, lineMat, torusMat, torus } = useMemo(() => {
    const pos: number[] = [];
    const seg = 128;
    const ring = (fn: (t: number) => [number, number, number]) => {
      for (let i = 0; i < seg; i++) {
        const a = fn((i / seg) * Math.PI * 2),
          b = fn(((i + 1) / seg) * Math.PI * 2);
        pos.push(...a, ...b);
      }
    };
    for (const lat of [-60, -30, 30, 60]) {
      const y = Math.sin((lat * Math.PI) / 180) * radius,
        r = Math.cos((lat * Math.PI) / 180) * radius;
      ring((t) => [Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    for (const lon of [30, 60, 120, 150]) {
      const a = (lon * Math.PI) / 180;
      ring((t) => [Math.cos(t) * Math.cos(a) * radius, Math.sin(t) * radius, Math.cos(t) * Math.sin(a) * radius]);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    const lineMat = new LineBasicNodeMaterial({
      color: new Color(preset.line),
      transparent: true,
      opacity: preset.lineOpacity * 0.75,
      depthWrite: false,
    });
    const torusMat = new MeshBasicNodeMaterial({
      color: new Color(preset.line),
      transparent: true,
      opacity: Math.min(1, preset.lineOpacity * 2),
      depthWrite: false,
    });
    const torus = new TorusGeometry(radius, 0.0042, 8, 220);
    return { lines: new LineSegments(g, lineMat), lineMat, torusMat, torus };
  }, [radius, preset]);
  useEffect(
    () => () => {
      lines.geometry.dispose();
      lineMat.dispose();
      torusMat.dispose();
      torus.dispose();
    },
    [lines, lineMat, torusMat, torus],
  );
  return (
    <group>
      <primitive object={lines} />
      {/* equator (x–y plane of the Bloch sphere) */}
      <mesh geometry={torus} material={torusMat} rotation={[Math.PI / 2, 0, 0]} />
      {/* x–z and y–z great circles */}
      <mesh geometry={torus} material={torusMat} />
      <mesh geometry={torus} material={torusMat} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

const AXIS_LABELS: { v: Vec3; tex: string; key: string }[] = [
  { v: [0, 0, 1], tex: '|0\\rangle', key: 'z+' },
  { v: [0, 0, -1], tex: '|1\\rangle', key: 'z-' },
  { v: [1, 0, 0], tex: '|+\\rangle', key: 'x+' },
  { v: [-1, 0, 0], tex: '|-\\rangle', key: 'x-' },
  { v: [0, 1, 0], tex: '|{+i}\\rangle', key: 'y+' },
  { v: [0, -1, 0], tex: '|{-i}\\rangle', key: 'y-' },
];

export function BlochAxes({
  radius = 1,
  labels = true,
  labelScale = 1,
}: {
  radius?: number;
  labels?: boolean;
  labelScale?: number;
}) {
  const preset = useScenePreset();
  const obj = useMemo(() => {
    const L = radius * 1.18;
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new BufferAttribute(Float32Array.of(-L, 0, 0, L, 0, 0, 0, -L, 0, 0, L, 0, 0, 0, -L, 0, 0, L), 3),
    );
    const m = new LineBasicNodeMaterial({
      color: new Color(preset.axis),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    return new LineSegments(g, m);
  }, [radius, preset]);
  useEffect(() => () => obj.geometry.dispose(), [obj]);
  return (
    <group>
      <primitive object={obj} />
      {labels &&
        AXIS_LABELS.map((l) => (
          <Html
            key={l.key}
            position={blochToThree(l.v).multiplyScalar(radius * 1.32)}
            center
            zIndexRange={[10, 0]}
            className="pointer-events-none select-none"
          >
            <span
              className="block font-mono whitespace-nowrap text-foreground/85"
              style={{ fontSize: `${0.82 * labelScale}rem` }}
            >
              <Tex math={l.tex} />
            </span>
          </Html>
        ))}
    </group>
  );
}

/** Glowing state arrow + projection guides, driven by an animator (no React re-render per frame). */
export function StateArrow({ animator, radius = 1 }: { animator: BlochAnimator; radius?: number }) {
  const preset = useScenePreset();
  const group = useRef<Group>(null);
  const shaft = useRef<Mesh>(null);
  const head = useRef<Mesh>(null);
  const tip = useRef<Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  const mats = useMemo(() => {
    const accent = new Color(preset.accent);
    const body = new MeshStandardNodeMaterial({ color: accent, roughness: 0.35, metalness: 0.1 });
    body.emissive = accent.clone();
    body.emissiveIntensity = preset.accentEmissive * 0.45;
    const glow = new MeshStandardNodeMaterial({ color: accent, roughness: 0.2 });
    glow.emissive = accent.clone();
    glow.emissiveIntensity = preset.accentEmissive;
    const guide = new LineBasicNodeMaterial({ color: accent, transparent: true, opacity: 0.45, depthWrite: false });
    return { body, glow, guide };
  }, [preset]);

  const geos = useMemo(
    () => ({
      shaft: new CylinderGeometry(0.016, 0.016, 1, 16, 1).translate(0, 0.5, 0),
      head: new ConeGeometry(0.05, 0.13, 24).translate(0, -0.065, 0),
      tip: new SphereGeometry(0.026, 24, 16),
      origin: new SphereGeometry(0.03, 20, 12),
    }),
    [],
  );

  const guide = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
    return new LineSegments(g, mats.guide);
  }, [mats]);

  useEffect(() => animator.onChange(() => invalidate()), [animator, invalidate]);

  const tmp = useMemo(() => ({ v: new Vector3(), q: new Quaternion() }), []);
  useFrame(() => {
    const v = blochToThree(animator.current, tmp.v).multiplyScalar(radius);
    const len = v.length();
    const show = len > 0.02;
    if (!group.current || !shaft.current || !head.current || !tip.current) return;
    group.current.visible = show;
    if (show) {
      tmp.q.setFromUnitVectors(UP, v.clone().normalize());
      group.current.quaternion.copy(tmp.q);
      const headLen = Math.min(0.13, len * 0.5);
      shaft.current.scale.set(1, Math.max(0.001, len - headLen), 1);
      head.current.position.set(0, len, 0);
      head.current.scale.setScalar(headLen / 0.13);
      tip.current.position.set(0, len + 0.012, 0);
      tip.current.scale.setScalar(1 + animator.flash * 2.5);
    }
    // projection guides: tip → equatorial plane → origin
    const p = guide.geometry.getAttribute('position') as BufferAttribute;
    p.setXYZ(0, v.x, v.y, v.z);
    p.setXYZ(1, v.x, 0, v.z);
    p.setXYZ(2, v.x, 0, v.z);
    p.setXYZ(3, 0, 0, 0);
    p.needsUpdate = true;
    guide.visible = show && Math.abs(v.y) < len * 0.995;
  });

  return (
    <group>
      <mesh geometry={geos.origin} material={mats.glow} />
      <group ref={group}>
        <mesh ref={shaft} geometry={geos.shaft} material={mats.body} castShadow />
        <mesh ref={head} geometry={geos.head} material={mats.body} castShadow />
        <mesh ref={tip} geometry={geos.tip} material={mats.glow} />
      </group>
      <primitive object={guide} />
    </group>
  );
}

/** Fading trail of the arrow tip (vertex alpha read in TSL). */
export function StateTrail({ animator, radius = 1 }: { animator: BlochAnimator; radius?: number }) {
  const preset = useScenePreset();
  const MAX = 240;
  const line = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(MAX * 3), 3));
    g.setAttribute('alpha', new BufferAttribute(new Float32Array(MAX), 1));
    g.setDrawRange(0, 0);
    const m = new LineBasicNodeMaterial({ transparent: true, depthWrite: false });
    m.colorNode = color(preset.accent);
    m.opacityNode = attribute<'float'>('alpha', 'float');
    m.blending = preset.name === 'dark' ? AdditiveBlending : NormalBlending;
    return new Line(g, m);
  }, [preset]);
  const invalidate = useThree((s) => s.invalidate);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const now = performance.now();
    const pts = animator.trail;
    const pos = line.geometry.getAttribute('position') as BufferAttribute;
    const alpha = line.geometry.getAttribute('alpha') as BufferAttribute;
    let n = 0;
    let fading = false;
    for (let i = Math.max(0, pts.length - MAX); i < pts.length; i++) {
      const age = (now - pts[i].t) / 2600;
      if (age > 1) continue;
      blochToThree(pts[i].v, tmp).multiplyScalar(radius);
      pos.setXYZ(n, tmp.x, tmp.y, tmp.z);
      alpha.setX(n, (1 - age) ** 2 * 0.9);
      n++;
      fading = true;
    }
    line.geometry.setDrawRange(0, n);
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    if (fading) invalidate();
  });

  return <primitive object={line} />;
}

/** During a gate animation: the rotation axis through the sphere. */
export function RotationGuide({ animator, radius = 1 }: { animator: BlochAnimator; radius?: number }) {
  const preset = useScenePreset();
  const line = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
    const m = new LineBasicNodeMaterial({
      color: new Color(preset.glow),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const l = new LineSegments(g, m);
    l.visible = false;
    return l;
  }, [preset]);
  const tmp = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const ax = animator.axis;
    line.visible = ax !== null;
    if (!ax) return;
    blochToThree(ax, tmp).multiplyScalar(radius * 1.25);
    const p = line.geometry.getAttribute('position') as BufferAttribute;
    p.setXYZ(0, -tmp.x, -tmp.y, -tmp.z);
    p.setXYZ(1, tmp.x, tmp.y, tmp.z);
    p.needsUpdate = true;
  });
  return <primitive object={line} />;
}

/** Soft floor that catches the arrow's shadow, plus a TSL contact-shadow blob under the sphere. */
export function StudioFloor({ y = -1.35 }: { y?: number }) {
  const preset = useScenePreset();
  const mat = useMemo(() => {
    const m = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    // radial soft shadow, darker in the centre
    const uvNode = attribute<'vec2'>('uv', 'vec2');
    const d = uvNode.sub(0.5).length().mul(2);
    m.colorNode = color(preset.name === 'dark' ? '#000000' : '#5b4a33');
    m.opacityNode = float(1)
      .sub(d.smoothstep(0.0, 1.0))
      .pow(2.2)
      .mul(preset.name === 'dark' ? 0.55 : 0.22);
    return m;
  }, [preset]);
  const geo = useMemo(() => new CircleGeometry(1.25, 64), []);
  return <mesh geometry={geo} material={mat} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} />;
}

export interface BlochSceneProps {
  animator: BlochAnimator;
  /** 0 = pure, 1 = maximally mixed (drives the fog) */
  mixedness?: number;
  labels?: boolean;
  radius?: number;
  position?: [number, number, number];
  floor?: boolean;
}

/** Complete Bloch sphere assembly. */
export function BlochSphere({
  animator,
  mixedness = 0,
  labels = true,
  radius = 1,
  position,
  floor = true,
}: BlochSceneProps) {
  return (
    <group position={position}>
      <SphereGrid radius={radius} />
      <BlochAxes radius={radius} labels={labels} />
      <StateTrail animator={animator} radius={radius} />
      <RotationGuide animator={animator} radius={radius} />
      <StateArrow animator={animator} radius={radius} />
      <DecoherenceFog amount={mixedness} radius={radius} />
      <GlassSphere radius={radius} />
      {floor && <StudioFloor y={-radius * 1.38} />}
    </group>
  );
}
