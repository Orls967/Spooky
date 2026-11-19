import { AgXToneMapping, WebGPURenderer } from 'three/webgpu';

export type GraphicsSupport = 'webgpu' | 'webgl2' | 'none';

let cached: GraphicsSupport | null = null;
let software: boolean | null = null;

/**
 * True when WebGL is backed by a CPU rasteriser (SwiftShader, llvmpipe, …). Such devices get the
 * low-quality path automatically — transmission, DOF and bloom are far too slow without a GPU.
 */
export function isSoftwareRenderer(): boolean {
  if (software !== null) return software;
  software = false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      software = /swiftshader|llvmpipe|software|softpipe|microsoft basic render/i.test(name);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    /* ignore */
  }
  return software;
}

/** Detect the best available backend without creating a renderer. */
export function detectGraphics(): GraphicsSupport {
  if (cached) return cached;
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu) {
    cached = 'webgpu';
    return cached;
  }
  try {
    const c = document.createElement('canvas');
    cached = c.getContext('webgl2') ? 'webgl2' : 'none';
  } catch {
    cached = 'none';
  }
  return cached;
}

/** Which backend the renderer actually ended up using (WebGPU may still fall back at adapter request time). */
export function rendererBackend(r: WebGPURenderer): 'webgpu' | 'webgl2' {
  const backend = r.backend as unknown as { isWebGPUBackend?: boolean };
  return backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
}

/**
 * Async renderer factory for R3F's `gl` prop. three's WebGPURenderer transparently falls back to its
 * WebGL2 backend when WebGPU is unavailable.
 */
export async function createRenderer(canvas: HTMLCanvasElement): Promise<WebGPURenderer> {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    forceWebGL: forceWebGL || detectGraphics() !== 'webgpu',
  });
  // If the WebGPU device is lost (driver reset, unsupported adapter), remount every canvas on WebGL2.
  renderer.onDeviceLost = () => {
    if (forceWebGL) return;
    forceWebGL = true;
    window.dispatchEvent(new Event(DEVICE_LOST_EVENT));
  };
  await renderer.init();
  renderer.toneMapping = AgXToneMapping;
  return renderer;
}

export const DEVICE_LOST_EVENT = 'spooky:device-lost';
let forceWebGL = false;
