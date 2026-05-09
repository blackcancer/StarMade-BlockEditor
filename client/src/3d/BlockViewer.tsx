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

import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
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

/**
 * Inner 3D scene — loaded inside a Suspense boundary.
 *
 * @component
 */
function Scene() {
  const selectedBlock = useBlockStore(s => s.selectedBlock);
  const orientation   = useBlockStore(s => s.orientation);
  const highlightFace = useBlockStore(s => s.highlightFace);
  const atlasSize     = useConfigStore(s => s.atlasSize);

  const [atlasTexture, setAtlasTexture] = useState<THREE.Texture | null>(null);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    loadAtlasTexture(atlasSize)
      .then(setAtlasTexture)
      .catch(e => setError(String(e)));
  }, [atlasSize]);

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#882222" />
      </mesh>
    );
  }

  if (!atlasTexture || !selectedBlock) return <LoadingCube />;

  return (
    <BlockMesh
      block={selectedBlock}
      atlasTexture={atlasTexture}
      orientation={orientation}
      highlightFace={highlightFace}
    />
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
        camera={{ position: [1.8, 1.4, 1.8], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-2, -3, -2]} intensity={0.3} />

        {/* Block */}
        <Suspense fallback={<LoadingCube />}>
          <Scene />
        </Suspense>

        {/* Grid */}
        <Grid
          args={[4, 4]}
          position={[0, -0.502, 0]}
          cellColor="#1e2d45"
          sectionColor="#2a4060"
          fadeDistance={8}
          infiniteGrid
        />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}
