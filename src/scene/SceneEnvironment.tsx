import { useEffect } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { EquirectangularReflectionMapping, type WebGPURenderer, type Scene } from 'three/webgpu';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { mix, screenUV, smoothstep, length, vec2, vec3 } from 'three/tsl';
import { inverseAgx, srgbHexToLinear } from './agx';
import { PRESETS, useScenePreset } from './theme';

// warm the cache for both themes so switching is instant
useLoader.preload(HDRLoader, [PRESETS.dark.hdr, PRESETS.light.hdr]);

/**
 * Image-based lighting from the locally generated studio HDR (see scripts/generate-hdr.mjs) and a
 * themed radial background drawn with TSL.
 */
export function SceneEnvironment() {
  const preset = useScenePreset();
  const tex = useLoader(HDRLoader, preset.hdr);
  const scene = useThree((s) => s.scene) as unknown as Scene;
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer;
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    tex.mapping = EquirectangularReflectionMapping;
    scene.environment = tex;
    scene.environmentIntensity = preset.envIntensity;
    gl.toneMappingExposure = preset.exposure;
    // radial vignette background
    const d = length(screenUV.sub(vec2(0.5, 0.45)).mul(vec2(1.0, 1.15)));
    // pre-compensate for the AgX output transform so the backdrop matches the page colours exactly
    const c = inverseAgx(srgbHexToLinear(preset.bgCenter), preset.exposure);
    const e = inverseAgx(srgbHexToLinear(preset.bgEdge), preset.exposure);
    scene.backgroundNode = mix(vec3(...c), vec3(...e), smoothstep(0.05, 0.85, d));
    invalidate();
    return () => {
      scene.environment = null;
      scene.backgroundNode = null;
    };
  }, [tex, scene, gl, preset, invalidate]);

  return null;
}
