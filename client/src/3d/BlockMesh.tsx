/**
 * @fileoverview BlockMesh — React-Three-Fiber component for single block rendering.
 *
 * Renders one StarMade block in the 3D preview using react-three-fiber (r3f).
 * The component is responsible for:
 *
 *  1. **Geometry selection** — dispatches to the correct geometry builder
 *     (`makeCubeGeometry`, `makeWedgeGeometry`, etc.) based on `blockStyle`.
 *
 *  2. **UV mapping** — computes effective texture tile IDs per face, accounting
 *     for the active/inactive state (`hasActivationTexture`) and animated frames.
 *
 *  3. **Material** — creates a `MeshStandardMaterial` with the diffuse atlas
 *     as `map` and the normal atlas as `normalMap`.
 *     - Normal maps are authored in the opposite Y convention to Three.js/OpenGL,
 *       so `normalScale.y` is negated (-2.2).
 *     - Emissive colour and intensity are set from `lightSourceColor` when the
 *       block is a light source in the active state.
 *
 *  4. **Orientation** — converts the orientation index (0–11 or 0–23) to a
 *     quaternion using the Euler angle table from `starmade_gl.js`.
 *
 *  5. **Slab geometry** — scales and offsets the mesh along Z to simulate
 *     vertical slab thickness (3/4, 1/2, 1/4).
 *
 *  6. **Animation** — uses `useFrame` to cycle through 4 texture tiles every
 *     ~0.5 s for animated blocks, matching the engine's shader animation.
 *
 *  7. **Point light** — renders a `<pointLight>` when `lightSource && isActive`,
 *     with parameters derived from `lightSourceColor`:
 *      - intensity = `2.5 × W` (W = the 4th component of LightSourceColor)
 *      - distance = 22 (matches `Occlusion.RAY_LENGTH` in StarMade-Open)
 *
 * ## Pure helpers (exported for testing)
 *  - `getEffectiveTextureIds` — computes per-face tile IDs given state + frame
 *  - `getSlabTransform`       — derives thickness and Z offset from slab value
 *  - `getLightColor`          — extracts a THREE.Color from LightSourceColor
 *  - `getLightIntensity`      — extracts the W intensity channel
 *  - `getEmissiveStrength`    — maps intensity → emissive value
 *  - `getOrientationQuaternion` — converts an orientation index to a quaternion
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeBlockGeometry, needsDoubleSide } from './geometries/index.js';
import type { BlockDef } from '../store/blockStore.js';

/**
 * Orientation index → Euler angles (degrees) mapping.
 *
 * Ported from `Cube.setOrientation()` in starmade_gl.js (StarOS BPViewer).
 * Covers the 12 standard orientations used by most StarMade block styles.
 * Styles 1 (Wedge) and 2 (Corner) extend this to 24 orientations.
 *
 * Index │ Angles [rx, ry, rz]  │ Description
 * ──────┼──────────────────────┼─────────────────────
 *   0   │ [0,    0,  0]        │ Default (front face +Z)
 *   1   │ [0,  180,  0]        │ 180° Y
 *   2   │ [90,  90,  0]        │ Up
 *   3   │ [270, 270,  0]       │ Down
 *   4   │ [0,  -90,  0]        │ Right
 *   5   │ [0,  270,  0]        │ Left
 *   6   │ [180,  0,  0]        │ Back-up
 *   7   │ [180, 90,  0]        │ Back-right
 *   8   │ [180, 180, 0]        │ Back-down
 *   9   │ [180, 270, 0]        │ Back-left
 *  10   │ [90,   0,  0]        │ Front-top
 *  11   │ [270,  0,  0]        │ Front-bottom
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

/**
 * Compute the effective texture tile IDs for all 6 faces of a block,
 * taking into account activation texture switching and animation.
 *
 * ## Active/inactive texture switching
 * Source: `ElementInformation.getTextureId(active, side)`
 *  - When `hasActivationTexture && !isActive`: use `tileId + 1`.
 *    The tile immediately to the right in the atlas shows the "off" state.
 *  - Otherwise: use the base `tileId`.
 *
 * ## Animated texture cycling
 * Source: cube shader animation code in StarMade-Open.
 *  - When `animated = true`, each face tile ID is offset by `animationFrame`
 *    (cycling 0→1→2→3→0 at ~2 fps / 0.5 s per frame).
 *  - Exception: when `individualSides === 3`, faces 2 (top) and 3 (bottom)
 *    do NOT animate (they share the same tile in the engine's grouped mode).
 *
 * @param {Pick<BlockDef, 'textureId' | 'hasActivationTexture' | 'animated' | 'individualSides'>} block
 * @param {boolean} isActive   Whether the block is in the active preview state.
 /**
 * Compute the effective texture tile IDs for all 6 faces of a block,
 * taking into account activation texture switching and animation.
 *
 * @param block Block properties needed for texture ID calculation.
 * @param isActive   Whether the block is in the active preview state.
 * @param animationFrame Current animation frame (0–3).
 * @returns Per-face tile IDs (same length as `block.textureId`).
 */
export function getEffectiveTextureIds(block: Pick<BlockDef, 'textureId' | 'hasActivationTexture' | 'animated' | 'individualSides'>, isActive: boolean, animationFrame: number): number[] {
  return block.textureId.map((tileId, sideIndex) => {
    // Engine behavior:
    // - getTextureId(active, side) uses tile + 1 when the block has an active/off texture and active=false.
    // - animated blocks then add animationTime, cycling 4 frames at ~0.5s per frame.
    const stateOffset = block.hasActivationTexture && !isActive ? 1 : 0;
    const animatesSide = block.animated && (block.individualSides !== 3 || (sideIndex !== 2 && sideIndex !== 3));
    const animationOffset = animatesSide ? animationFrame : 0;
    return tileId + stateOffset + animationOffset;
  });
}

/**
 * Compute the slab scale and Z-axis offset for a block's slab value.
 *
 * StarMade slabs reduce depth along the block's local Z axis (vertical slab
 * convention — not the Y axis). The slab is always flush with one face:
 * the block is scaled down and then shifted so its front face stays at z=0.5.
 *
 * Slab value │ Thickness │ Z offset
 * ───────────┼───────────┼──────────
 *     0      │   1.00    │   0.000  (full block)
 *     1      │   0.75    │  -0.125  (3/4 slab)
 *     2      │   0.50    │  -0.250  (1/2 slab)
 *     3      │   0.25    │  -0.375  (1/4 slab)
 *
 /**
 * Compute the slab scale and Z-axis offset for a block's slab value.
 * Slab reduces depth along local Z (vertical slab convention).
 * @param slab Slab value (0=full, 1=3/4, 2=1/2, 3=1/4).
 */
export function getSlabTransform(slab: number): { thickness: number; offsetZ: number } {
  const thickness = slab === 1 ? 0.75 : slab === 2 ? 0.5 : slab === 3 ? 0.25 : 1;
  return { thickness, offsetZ: (thickness - 1) / 2 };
}

/**
 * Extract a THREE.Color from the LightSourceColor RGBA array.
 *
 * Clamps each channel to [0, 1] to avoid invalid Three.js colour values.
 * Uses [1, 1, 1] (white) as default when the array is missing or short.
 *
 * @param {number[]} [rgba] LightSourceColor array [R, G, B, W].
 /** Extract RGB Three.js Color from LightSourceColor RGBA. Clamps to [0,1]. */
export function getLightColor(rgba?: number[]): THREE.Color {
  const [r = 1, g = 1, b = 1] = rgba ?? [1, 1, 1, 1];
  return new THREE.Color(
    THREE.MathUtils.clamp(r, 0, 1),
    THREE.MathUtils.clamp(g, 0, 1),
    THREE.MathUtils.clamp(b, 0, 1),
  );
}

/**
 * Extract the W (intensity) channel from the LightSourceColor RGBA array.
 *
 * Source: `Occlusion.java` — light contribution = `ray.depths[d] * 2.5 * W`.
 * W typically ranges 0–2 in vanilla StarMade light source blocks.
 *
 * @param {number[]} [rgba] LightSourceColor array.
 /** Extract the W (intensity) channel from LightSourceColor. Minimum 0. */
export function getLightIntensity(rgba?: number[]): number {
  return Math.max(0, rgba?.[3] ?? 1);
}

/**
 * Map a light intensity value to a Three.js emissive strength.
 *
 * The engine propagates emitted light to surrounding geometry; the source block
 * itself should not become a washed-out fullbright surface in the preview.
 * This mapping keeps emissive low enough to stay visually plausible while
 * still conveying the block's active light state.
 *
 * Formula: `clamp(0.18 + intensity * 0.25, 0, 0.85)`
 *
 * @param {number} lightIntensity W channel from `getLightIntensity`.
 /** Map light intensity to Three.js emissive strength. Formula: clamp(0.18 + i*0.25, 0, 0.85). */
export function getEmissiveStrength(lightIntensity: number): number {
  return Math.min(0.85, 0.18 + lightIntensity * 0.25);
}

/**
 * Convert an orientation index to a THREE.Quaternion.
 *
 * Uses the `ORIENTATIONS` Euler angle table (ported from `starmade_gl.js`
 * `Cube.setOrientation()`). The index is normalised modulo the table length
 * to handle out-of-range values gracefully.
 *
 * @param {number} orientation Orientation index (0–11 for most styles).
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
    () => getEffectiveTextureIds(block, isActive, animationFrame),
    [block, isActive, animationFrame],
  );

  // ── Build geometry ─────────────────────────────────────────────────────────
  const geometry = useMemo(
    () => makeBlockGeometry(block.blockStyle, effectiveTextureIds, block.individualSides),
    [block.blockStyle, effectiveTextureIds, block.individualSides],
  );

  const lightColor = useMemo(() => getLightColor(block.lightSourceColor), [block.lightSourceColor]);

  const lightIntensity = useMemo(
    () => getLightIntensity(block.lightSourceColor),
    [block.lightSourceColor],
  );

  // The engine propagates emitted light to surrounding geometry; the source block
  // itself should not become a washed-out fullbright surface in the preview.
  const emissiveStrength = useMemo(
    () => getEmissiveStrength(lightIntensity),
    [lightIntensity],
  );

  const lightEnabled = block.lightSource && isActive;

  const { thickness: slabThickness, offsetZ: slabOffsetZ } = getSlabTransform(block.slab);

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
  const quaternion = useMemo(() => getOrientationQuaternion(orientation), [orientation]);

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
