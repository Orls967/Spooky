import { useScenePreset } from './theme';

/** Key light (casts the arrow's soft shadow) + gentle fill; most light comes from the HDR environment. */
export function StudioLights() {
  const preset = useScenePreset();
  return (
    <>
      <directionalLight
        position={[2.5, 5, 1.5]}
        intensity={preset.name === 'dark' ? 1.4 : 1.8}
        color={preset.name === 'dark' ? '#cfe0ff' : '#fff4e2'}
      />
      <ambientLight intensity={preset.name === 'dark' ? 0.08 : 0.25} />
    </>
  );
}
