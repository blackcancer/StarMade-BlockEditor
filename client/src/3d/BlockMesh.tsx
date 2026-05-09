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

import { useMemo } from 'react';
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
  /** Atlas Three.js texture (already loaded). */
  atlasTexture:  THREE.Texture;
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
  orientation  = 0,
  highlightFace = -1,
}: BlockMeshProps) {

  // ── Build geometry ─────────────────────────────────────────────────────────
  const geometry = useMemo(
    () => makeBlockGeometry(block.blockStyle, block.textureId, block.individualSides),
    [block.blockStyle, block.textureId, block.individualSides],
  );

  // ── Build material(s) ─────────────────────────────────────────────────────
  const material = useMemo(() => {
    const tex = atlasTexture.clone();
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map:         tex,
      side:        needsDoubleSide(block.blockStyle) ? THREE.DoubleSide : THREE.FrontSide,
      transparent: block.transparency,
      alphaTest:   block.transparency ? 0.1 : 0,
      metalness:   0,
      roughness:   0.8,
    });
  }, [atlasTexture, block.blockStyle, block.transparency]);

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
    <mesh
      geometry={geometry}
      material={material}
      quaternion={quaternion}
      castShadow
      receiveShadow
    />
  );
}
