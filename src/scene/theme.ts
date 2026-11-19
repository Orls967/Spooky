import { useResolvedTheme } from '@/store/settings';

export interface ScenePreset {
  name: 'dark' | 'light';
  hdr: string;
  envIntensity: number;
  exposure: number;
  bgCenter: string;
  bgEdge: string;
  bloomStrength: number;
  bloomRadius: number;
  /** wireframe / grid lines on the sphere */
  line: string;
  lineOpacity: number;
  axis: string;
  /** primary accent (state vector) */
  accent: string;
  accentEmissive: number;
  /** soft secondary glow (entanglement thread, rims) */
  glow: string;
  glass: { tint: string; iridescence: number; roughness: number; attenuation: string };
  particles: string;
  particleOpacity: number;
  floor: string;
}

const BASE = import.meta.env.BASE_URL;

export const PRESETS: Record<'dark' | 'light', ScenePreset> = {
  dark: {
    name: 'dark',
    hdr: `${BASE}hdr/lab-night.hdr`,
    envIntensity: 1.1,
    exposure: 1.05,
    bgCenter: '#141b2b',
    bgEdge: '#07090f',
    bloomStrength: 0.85,
    bloomRadius: 0.45,
    line: '#8fa4cc',
    lineOpacity: 0.28,
    axis: '#c9d2e4',
    accent: '#f2b84b',
    accentEmissive: 2.4,
    glow: '#7fb7ff',
    glass: { tint: '#dfe9ff', iridescence: 0.35, roughness: 0.04, attenuation: '#c4d6ff' },
    particles: '#a9c4ff',
    particleOpacity: 0.55,
    floor: '#0b0f18',
  },
  light: {
    name: 'light',
    hdr: `${BASE}hdr/notebook-day.hdr`,
    envIntensity: 0.75,
    exposure: 0.92,
    bgCenter: '#f9f5ed',
    bgEdge: '#e9e1d2',
    bloomStrength: 0.28,
    bloomRadius: 0.3,
    line: '#2f3646',
    lineOpacity: 0.5,
    axis: '#2c3240',
    accent: '#c2570c',
    accentEmissive: 0.9,
    glow: '#3d6fd1',
    glass: { tint: '#e9eef7', iridescence: 0.22, roughness: 0.06, attenuation: '#e8dcc6' },
    particles: '#4a5468',
    particleOpacity: 0.85,
    floor: '#e6dccb',
  },
};

export function useScenePreset(): ScenePreset {
  const resolved = useResolvedTheme((s) => s.resolved);
  return PRESETS[resolved];
}
