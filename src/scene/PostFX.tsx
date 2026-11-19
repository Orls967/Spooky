import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RenderPipeline, type WebGPURenderer, type Scene, type Camera } from 'three/webgpu';
import { pass, mrt, output, emissive } from 'three/tsl';
import { focusUniforms } from './focus';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { dof as dofNode } from 'three/examples/jsm/tsl/display/DepthOfFieldNode.js';
import type { Quality } from '@/store/scene';
import { useScenePreset } from './theme';

/**
 * Post-processing on three's node-based RenderPipeline:
 *  - selective bloom: the scene pass writes an `emissive` MRT target, only emissive surfaces bloom
 *  - optional depth of field for "focus moments" (driven by focusUniforms.bokeh)
 *  - AgX tone mapping + sRGB output transform
 */
export function PostFX({ quality, dof = false }: { quality: Quality; dof?: boolean }) {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer;
  const scene = useThree((s) => s.scene) as unknown as Scene;
  const camera = useThree((s) => s.camera) as unknown as Camera;
  const invalidate = useThree((s) => s.invalidate);
  const preset = useScenePreset();

  const { pipeline, bloomPass } = useMemo(() => {
    const pipeline = new RenderPipeline(gl);
    const scenePass = pass(scene, camera);
    if (quality === 'low') {
      pipeline.outputNode = scenePass;
      return { pipeline, bloomPass: null };
    }
    scenePass.setMRT(mrt({ output, emissive }));
    const color = scenePass.getTextureNode('output');
    const emissiveTex = scenePass.getTextureNode('emissive');
    const bloomPass = bloom(emissiveTex, 0.8, 0.4, 0);
    let base = color;
    if (dof) {
      const viewZ = scenePass.getViewZNode();
      base = dofNode(
        color,
        viewZ,
        focusUniforms.distance,
        focusUniforms.focalLength,
        focusUniforms.bokeh,
      ) as unknown as typeof color;
    }
    pipeline.outputNode = base.add(bloomPass);
    return { pipeline, bloomPass };
  }, [gl, scene, camera, quality, dof]);

  useEffect(() => {
    if (bloomPass) {
      bloomPass.strength.value = quality === 'medium' ? preset.bloomStrength * 0.7 : preset.bloomStrength;
      bloomPass.radius.value = preset.bloomRadius;
    }
    invalidate();
  }, [bloomPass, preset, quality, invalidate]);

  useEffect(() => () => pipeline.dispose(), [pipeline]);

  // priority 1 → R3F stops its default render; we render through the pipeline instead
  useFrame(() => {
    pipeline.render();
  }, 1);

  return null;
}
