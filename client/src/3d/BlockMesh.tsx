/**
 * @fileoverview BlockMesh — React-Three-Fiber component for single block rendering.
 *
 * ## Geometry caching strategy
 * This component separates **shape** (positions, normals) from **texture UVs**:
 *
 *  - **Shape** changes only when `blockStyle` or `individualSides` changes.
 *    A module-level cache in `geometryCache.ts` stores one base geometry per
 *    unique (blockStyle, individualSides) key (max 21 entries for all 7 styles
 *    × 3 UV modes). Instances are cloned from the cache on shape change.
 *
 *  - **UVs** change on every texture update (animation frames every 0.5 s,
 *    active/inactive toggle, face assignment). When only UVs change, the UV
 *    Float32Array is mutated in-place via `updateGeometryUVs` and flagged
 *    `needsUpdate = true` — no geometry rebuild, no VBO reallocation for
 *    positions/normals, minimal GC pressure.
 *
 *  - **Material** changes only on atlas, transparency, or light state changes.
 *    The material object is cached via `useMemo` and reused across texture updates.
 *    The atlas texture itself is shared (same `THREE.Texture` instance) — only a
 *    pointer is stored in the material, not a copy of the texture data.
 *
 * ## Update cost comparison
 *
 * | Event                  | Before                          | After                     |
 * |------------------------|---------------------------------|---------------------------|
 * | Animation frame (0.5s) | Full geometry rebuild + GC      | UV buffer write (~288 B)  |
 * | Active/inactive toggle | Full geometry rebuild + GC      | UV buffer write           |
 * | Face tile change       | Full geometry rebuild + GC      | UV buffer write           |
 * | blockStyle change      | Full geometry rebuild + GC      | Clone from cache + UV set |
 * | Atlas/material change  | New material object             | New material object       |
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { needsDoubleSide } from './geometries/index.js';
import {
  createInstanceGeometry,
  updateGeometryUVs,
} from './geometryCache.js';
import type { BlockDef } from '../store/blockStore.js';

/**
 * Orientation index → Euler angles (degrees) mapping.
 *
 * Ported from `Cube.setOrientation()` in starmade_gl.js (StarOS BPViewer).
 * Covers the 12 standard orientations used by most StarMade block styles.
 * Styles 1 (Wedge) and 2 (Corner) extend this to 24 orientations.
 */
export const ORIENTATIONS: Array<[number, number, number]> = [
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

// ── Pure helpers (exported for testing) ───────────────────────────────────────

/**
 * Compute the effective texture tile IDs for all 6 faces of a block.
 *
 * Applies activation texture offset (+1 when inactive) and animation frame
 * offset per face, matching the StarMade engine's `ElementInformation.getTextureId()`.
 */
export function getEffectiveTextureIds(
  block: Pick<BlockDef, 'textureId' | 'hasActivationTexture' | 'animated' | 'individualSides'>,
  isActive: boolean,
  animationFrame: number,
): number[] {
  return block.textureId.map((tileId, sideIndex) => {
    const stateOffset   = block.hasActivationTexture && !isActive ? 1 : 0;
    const animatesSide  = block.animated && (block.individualSides !== 3 || (sideIndex !== 2 && sideIndex !== 3));
    const animationOffset = animatesSide ? animationFrame : 0;
    return tileId + stateOffset + animationOffset;
  });
}

/**
 * Compute the slab scale and Z-axis offset.
 * Slab reduces depth along local Z (vertical slab convention).
 * 0=full, 1=3/4, 2=1/2, 3=1/4.
 */
export function getSlabTransform(slab: number): { thickness: number; offsetZ: number } {
  const thickness = slab === 1 ? 0.75 : slab === 2 ? 0.5 : slab === 3 ? 0.25 : 1;
  return { thickness, offsetZ: (thickness - 1) / 2 };
}

/** Extract RGB Three.js Color from LightSourceColor RGBA. Clamps to [0,1]. */
export function getLightColor(rgba?: number[]): THREE.Color {
  const [r = 1, g = 1, b = 1] = rgba ?? [1, 1, 1, 1];
  return new THREE.Color(
    THREE.MathUtils.clamp(r, 0, 1),
    THREE.MathUtils.clamp(g, 0, 1),
    THREE.MathUtils.clamp(b, 0, 1),
  );
}

/** Extract the W (intensity) channel from LightSourceColor. Minimum 0. */
export function getLightIntensity(rgba?: number[]): number {
  return Math.max(0, rgba?.[3] ?? 1);
}

/** Map light intensity to Three.js emissive strength. Formula: clamp(0.18 + i*0.25, 0, 0.85). */
export function getEmissiveStrength(lightIntensity: number): number {
  return Math.min(0.85, 0.18 + lightIntensity * 0.25);
}

/** Convert an orientation index to a THREE.Quaternion using the ORIENTATIONS table. */
export function getOrientationQuaternion(orientation: number): THREE.Quaternion {
  const o = ((orientation % ORIENTATIONS.length) + ORIENTATIONS.length) % ORIENTATIONS.length;
  const [rx, ry, rz] = ORIENTATIONS[o];
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(rx),
    THREE.MathUtils.degToRad(ry),
    THREE.MathUtils.degToRad(rz),
  );
  return new THREE.Quaternion().setFromEuler(euler);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface BlockMeshProps {
  /** Full block definition from the API. */
  block:          BlockDef;
  /** Diffuse atlas Three.js texture (already loaded, shared). */
  atlasTexture:   THREE.Texture;
  /** Normal atlas Three.js texture (already loaded, shared). */
  normalTexture?: THREE.Texture | null;
  /** Orientation index (0–11). Defaults to 0. */
  orientation?:   number;
  /** Whether to show the block in "active" texture state. */
  isActive?:      boolean;
  /** Highlighted face index for face-editing mode (0=front…5=left, -1=none). */
  highlightFace?: number;
}

/**
 * Single StarMade block mesh component for react-three-fiber.
 *
 * Uses a geometry cache to avoid rebuilding positions/normals on every texture
 * change. Only the UV buffer is updated when texture IDs change (animation,
 * active toggle, face assignment). See module header for details.
 *
 * @component
 */
export function BlockMesh({
  block,
  atlasTexture,
  normalTexture = null,
  orientation   = 0,
  isActive      = true,
  highlightFace = -1,
}: BlockMeshProps) {

  // ── Animation frame (driven by r3f clock) ─────────────────────────────────
  const [animationFrame, setAnimationFrame] = useState(0);

  useFrame(({ clock }) => {
    if (!block.animated) return;
    const nextFrame = Math.floor(clock.elapsedTime / 0.5) % 4;
    setAnimationFrame(prev => (prev === nextFrame ? prev : nextFrame));
  });

  // ── Effective texture IDs (memoised, cheap to compute) ────────────────────
  const effectiveTextureIds = useMemo(
    () => getEffectiveTextureIds(block, isActive, animationFrame),
    [block, isActive, animationFrame],
  );

  // ── Shape key — drives instance geometry creation ──────────────────────────
  // Only reacts to SHAPE changes (blockStyle, individualSides).
  // UV changes do NOT cause this to recompute.
  const shapeKey = `${block.blockStyle}:${block.individualSides}`;

  // ── Instance geometry ─────────────────────────────────────────────────────
  // Created (or recreated) only when the shape key changes.
  // Cloned from the module-level shape cache — positions/normals are shared data,
  // the clone owns its UV attribute which we mutate in-place below.
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  useMemo(() => {
    // Dispose the previous instance geometry (frees the UV VBO on GPU)
    if (geometryRef.current) geometryRef.current.dispose();
    // Create a new instance with current texture IDs as initial UVs
    geometryRef.current = createInstanceGeometry(
      block.blockStyle,
      effectiveTextureIds,
      block.individualSides,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey]); // ← intentionally excludes effectiveTextureIds

  // ── UV-only update — the hot path ─────────────────────────────────────────
  // Runs whenever effectiveTextureIds changes (animation, toggle, face change).
  // Mutates only the UV buffer in-place; no geometry rebuild, no GC.
  useEffect(() => {
    const geo = geometryRef.current;
    if (!geo) return;
    updateGeometryUVs(geo, block.blockStyle, effectiveTextureIds, block.individualSides);
  }, [effectiveTextureIds, block.blockStyle, block.individualSides]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Dispose the instance geometry on unmount.
      // The base geometry in the cache is NOT disposed here.
      geometryRef.current?.dispose();
      geometryRef.current = null;
    };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const lightColor = useMemo(() => getLightColor(block.lightSourceColor), [block.lightSourceColor]);
  const lightIntensity = useMemo(() => getLightIntensity(block.lightSourceColor), [block.lightSourceColor]);
  const emissiveStrength = useMemo(() => getEmissiveStrength(lightIntensity), [lightIntensity]);
  const lightEnabled = block.lightSource && isActive;
  const { thickness: slabThickness, offsetZ: slabOffsetZ } = getSlabTransform(block.slab);

  // ── Material ───────────────────────────────────────────────────────────────
  // Recreated only when atlas texture, transparency, or light state changes.
  // `atlasTexture` is the same shared `THREE.Texture` instance — the material
  // just holds a reference, no data is copied.
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map:               atlasTexture,
      normalMap:         normalTexture,
      // StarMade normal maps are Y-flipped relative to Three.js/OpenGL convention.
      normalScale:       new THREE.Vector2(2.2, -2.2),
      emissive:          lightEnabled ? lightColor : new THREE.Color(0x000000),
      emissiveIntensity: lightEnabled ? emissiveStrength : 0,
      side:              needsDoubleSide(block.blockStyle) ? THREE.DoubleSide : THREE.FrontSide,
      transparent:       block.transparency,
      alphaTest:         block.transparency ? 0.1 : 0,
      metalness:         0,
      roughness:         0.8,
    });
  }, [atlasTexture, normalTexture, block.blockStyle, block.transparency, lightEnabled, emissiveStrength, lightColor]);

  // Dispose material on unmount or when it changes
  useEffect(() => () => material.dispose(), [material]);

  // ── Orientation quaternion ────────────────────────────────────────────────
  const quaternion = useMemo(() => getOrientationQuaternion(orientation), [orientation]);

  // ── Render ────────────────────────────────────────────────────────────────
  // We pass the geometry ref directly; r3f re-renders when geometry or material
  // changes, but UV-only updates bypass React state and update the GPU directly.
  const geometry = geometryRef.current;
  if (!geometry) return null;

  return (
    <group quaternion={quaternion}>
      <mesh
        geometry={geometry}
        material={material}
        scale={[1, 1, slabThickness]}
        position={[0, 0, slabOffsetZ]}
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
