/**
 * @fileoverview BlockViewer 3D canvas component.
 *
 * Renders the selected block in a react-three-fiber Canvas with:
 *  - OrbitControls (drag to rotate, scroll to zoom)
 *  - Ambient + directional lighting
 *  - Grid helper
 *  - Atlas texture loading via /api/textures/atlas
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BlockMesh } from './BlockMesh.js';
import { loadAtlasTexture } from './AtlasTexture.js';
import { useBlockStore } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';

/**
 * Fallback mesh shown while the atlas texture is loading.
 *
 * @component
 */
function LoadingCube() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#334466" wireframe />
    </mesh>
  );
}

function LightingRig() {
  const draft = useBlockStore(s => s.draft);
  const previewActive = useBlockStore(s => s.previewActive);
  const activeLightPreview = !!draft?.lightSource && previewActive;

  if (!activeLightPreview) {
    return (
      <group key="standard-scene-lighting">
        {/* Standard scene lighting: used for normal blocks and light blocks when OFF. */}
        <ambientLight intensity={0.72} />
        <hemisphereLight args={['#d6e2f7', '#46566f', 0.78]} />
        <directionalLight
          position={[3.4, 4.4, 2.4]}
          intensity={1.85}
          color="#f5f8ff"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-2.5, 1.2, 2.5]} intensity={0.62} color="#88c1ff" />
        <pointLight position={[2.2, -1.0, -2.0]} intensity={0.36} color="#e4c57c" />
      </group>
    );
  }

  return (
    <group key="active-light-preview-lighting">
      {/* Active light preview: much dimmer base scene so emitted light contribution is visible. */}
      <ambientLight intensity={0.08} />
      <hemisphereLight args={['#7890b4', '#101722', 0.16]} />
      <directionalLight
        position={[3.4, 4.4, 2.4]}
        intensity={0.46}
        color="#dce8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-2.5, 1.2, 2.5]} intensity={0.05} color="#6aa8ff" />
      <pointLight position={[2.2, -1.0, -2.0]} intensity={0.03} color="#d7b56d" />
    </group>
  );
}

function LightFootprint({ color, intensity }: { color: THREE.Color; intensity: number }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.14)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.496, 0]} renderOrder={2}>
      <circleGeometry args={[22, 96]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={Math.min(0.45, 0.12 + intensity * 0.08)}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Inner 3D scene — loaded inside a Suspense boundary.
 *
 * @component
 */
function Scene() {
  const draft         = useBlockStore(s => s.draft);
  const orientation   = useBlockStore(s => s.orientation);
  const previewActive = useBlockStore(s => s.previewActive);
  const highlightFace = useBlockStore(s => s.highlightFace);
  const atlasSize     = useConfigStore(s => s.atlasSize);
  const texturePack   = useConfigStore(s => s.texturePack);
  const isValid       = useConfigStore(s => s.isValid);

  const [atlasTexture, setAtlasTexture]   = useState<THREE.Texture | null>(null);
  const [normalTexture, setNormalTexture] = useState<THREE.Texture | null>(null);
  const [atlasVersion, setAtlasVersion]   = useState(0);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setAtlasVersion(v => v + 1);
    window.addEventListener('atlas-imported', handler);
    return () => window.removeEventListener('atlas-imported', handler);
  }, []);

  useEffect(() => {
    if (!isValid) {
      setAtlasTexture(null);
      setNormalTexture(null);
      setError(null);
      return;
    }

    Promise.all([
      loadAtlasTexture(atlasSize, texturePack, 'diffuse'),
      loadAtlasTexture(atlasSize, texturePack, 'normal'),
    ])
      .then(([diffuse, normal]) => {
        setAtlasTexture(diffuse);
        setNormalTexture(normal);
        setError(null);
      })
      .catch(e => setError(String(e)));
  }, [atlasSize, texturePack, isValid, atlasVersion]);

  const lightEnabled = !!draft?.lightSource && previewActive;
  const lightColor = useMemo(() => {
    const [r = 1, g = 1, b = 1] = draft?.lightSourceColor ?? [1, 1, 1, 1];
    return new THREE.Color(
      THREE.MathUtils.clamp(r, 0, 1),
      THREE.MathUtils.clamp(g, 0, 1),
      THREE.MathUtils.clamp(b, 0, 1),
    );
  }, [draft?.lightSourceColor]);
  const lightIntensity = Math.max(0, draft?.lightSourceColor?.[3] ?? 1);

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#882222" />
      </mesh>
    );
  }

  if (!draft) return <LoadingCube />;
  if (!isValid || !atlasTexture) return <LoadingCube />;

  return (
    <>
      <BlockMesh
        block={draft}
        atlasTexture={atlasTexture}
        normalTexture={normalTexture}
        orientation={orientation}
        isActive={previewActive}
        highlightFace={highlightFace}
      />
      {lightEnabled && <LightFootprint color={lightColor} intensity={lightIntensity} />}
    </>
  );
}

/**
 * BlockViewer — the main 3D canvas for previewing a block.
 *
 * @component
 */
export function BlockViewer() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1117' }}>
      <Canvas
        camera={{ position: [2.2, 1.7, 2.2], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <LightingRig />

        {/* Preview floor — makes emissive blocks/read lighting much easier to judge. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.501, 0]} receiveShadow>
          <planeGeometry args={[48, 48]} />
          <meshStandardMaterial color="#2d3a4d" roughness={0.9} metalness={0.02} />
        </mesh>

        {/* Block */}
        <Suspense fallback={<LoadingCube />}>
          <Scene />
        </Suspense>

        {/* Grid */}
        <Grid
          args={[48, 48]}
          position={[0, -0.5, 0]}
          cellColor="#1e2d45"
          sectionColor="#2a4060"
          fadeDistance={32}
          infiniteGrid
        />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={32}
        />
      </Canvas>
    </div>
  );
}
