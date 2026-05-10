/**
 * @fileoverview BlockMesh React component.
 *
 * Renders a single StarMade block in the 3D viewport using react-three-fiber.
 * Selects geometry by blockStyle, applies atlas UV mapping, and supports
 * orientation via quaternion rotation.
 *
 * Orientation angles follow the starmade_gl.js Cube.setOrientation() mapping.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeBlockGeometry, needsDoubleSide } from './geometries/index.js';
import type { BlockDef } from '../store/blockStore.js';

/** Orientation index → Euler angles (degrees) mapping from starmade_gl.js. */
const ORIENTATIONS: Array<[number, number, number]> = [
  [0,    0, 0],  // 0  — default (front facing +Z)
  [0,  180, 0],  // 1  — 180° Y
  [90,  90, 0],  // 2  — up
  [270, 270, 0], // 3  — down
  [0,  -90, 0],  // 4  — right
  [0,  270, 0],  // 5  — left
  [180,  0, 0],  // 6  — back-up
  [180, 90, 0],  // 7  — back-right
  [180,180, 0],  // 8  — back-down
  [180,270, 0],  // 9  — back-left
  [90,   0, 0],  // 10 — front-top
  [270,  0, 0],  // 11 — front-bottom
];

interface BlockMeshProps {
  /** Full block definition from the API. */
  block:         BlockDef;
  /** Diffuse atlas Three.js texture (already loaded). */
  atlasTexture:  THREE.Texture;
  /** Normal atlas Three.js texture (already loaded). */
  normalTexture?: THREE.Texture | null;
  /** Orientation index (0–11). Defaults to 0. */
  orientation?:  number;
  /** Whether to show the block in "active" texture state. */
  isActive?:     boolean;
  /** Highlighted face index for face-editing mode (0=front…5=left, -1=none). */
  highlightFace?: number;
}

/**
 * Single StarMade block mesh component for react-three-fiber.
 *
 * @component
 */
export function BlockMesh({
  block,
  atlasTexture,
  normalTexture = null,
  orientation  = 0,
  isActive = true,
  highlightFace = -1,
}: BlockMeshProps) {

  const [animationFrame, setAnimationFrame] = useState(0);

  useFrame(({ clock }) => {
    if (!block.animated) return;
    const nextFrame = Math.floor(clock.elapsedTime / 0.5) % 4;
    setAnimationFrame(prev => (prev === nextFrame ? prev : nextFrame));
  });

  const effectiveTextureIds = useMemo(
    () => block.textureId.map((tileId, sideIndex) => {
      // Engine behavior:
      // - getTextureId(active, side) uses tile + 1 when the block has an active/off texture and active=false.
      // - animated blocks then add animationTime, cycling 4 frames at ~0.5s per frame.
      const stateOffset = block.hasActivationTexture && !isActive ? 1 : 0;
      const animatesSide = block.animated && (block.individualSides !== 3 || (sideIndex !== 2 && sideIndex !== 3));
      const animationOffset = animatesSide ? animationFrame : 0;
      return tileId + stateOffset + animationOffset;
    }),
    [block.textureId, block.hasActivationTexture, block.canActivate, block.animated, block.individualSides, isActive, animationFrame],
  );

  // ── Build geometry ─────────────────────────────────────────────────────────
  const geometry = useMemo(
    () => makeBlockGeometry(block.blockStyle, effectiveTextureIds, block.individualSides),
    [block.blockStyle, effectiveTextureIds, block.individualSides],
  );

  const lightColor = useMemo(() => {
    const [r = 1, g = 1, b = 1] = block.lightSourceColor ?? [1, 1, 1, 1];
    return new THREE.Color(
      THREE.MathUtils.clamp(r, 0, 1),
      THREE.MathUtils.clamp(g, 0, 1),
      THREE.MathUtils.clamp(b, 0, 1),
    );
  }, [block.lightSourceColor]);

  const lightIntensity = useMemo(
    () => Math.max(0, block.lightSourceColor?.[3] ?? 1),
    [block.lightSourceColor],
  );

  // The engine propagates emitted light to surrounding geometry; the source block
  // itself should not become a washed-out fullbright surface in the preview.
  const emissiveStrength = useMemo(
    () => Math.min(0.85, 0.18 + lightIntensity * 0.25),
    [lightIntensity],
  );

  const lightEnabled = block.lightSource && isActive;

  const slabHeight = block.slab === 1 ? 0.75 : block.slab === 2 ? 0.5 : block.slab === 3 ? 0.25 : 1;
  const slabOffsetY = (slabHeight - 1) / 2;

  // ── Build material(s) ─────────────────────────────────────────────────────
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map:         atlasTexture,
      normalMap:   normalTexture,
      // StarMade normal maps are authored in the opposite Y convention to Three.js/OpenGL.
      normalScale: new THREE.Vector2(2.2, -2.2),
      emissive:    lightEnabled ? lightColor : new THREE.Color(0x000000),
      emissiveIntensity: lightEnabled ? emissiveStrength : 0,
      side:        needsDoubleSide(block.blockStyle) ? THREE.DoubleSide : THREE.FrontSide,
      transparent: block.transparency,
      alphaTest:   block.transparency ? 0.1 : 0,
      metalness:   0,
      roughness:   0.8,
    });
  }, [atlasTexture, normalTexture, block.blockStyle, block.transparency, lightEnabled, emissiveStrength, lightColor]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // ── Orientation quaternion from starmade_gl.js Cube.setOrientation ────────
  const quaternion = useMemo(() => {
    const o = orientation % ORIENTATIONS.length;
    const [rx, ry, rz] = ORIENTATIONS[o];
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(rx),
      THREE.MathUtils.degToRad(ry),
      THREE.MathUtils.degToRad(rz),
    );
    return new THREE.Quaternion().setFromEuler(euler);
  }, [orientation]);

  return (
    <group quaternion={quaternion}>
      <mesh
        geometry={geometry}
        material={material}
        scale={[1, slabHeight, 1]}
        position={[0, slabOffsetY, 0]}
        castShadow
        receiveShadow
      />
      {lightEnabled && (
        <pointLight
          position={[0, 0.22, 0]}
          color={lightColor}
          intensity={2.5 * lightIntensity}
          distance={22}
          decay={1}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.0008}
        />
      )}
    </group>
  );
}
