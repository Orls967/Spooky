import { uniform } from 'three/tsl';

/** Depth-of-field uniforms; animate `bokeh` > 0 for "focus moments". */
export const focusUniforms = {
  distance: uniform(4.2),
  focalLength: uniform(2.4),
  bokeh: uniform(0),
};
