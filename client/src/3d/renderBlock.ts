/** @fileoverview Adapts the current editable DTO to StarMade-3D without a stale server render snapshot. */
import { blockDefinitionFromConfig, createStarMadeCubeAtlasLayout, normalizeTextureIds,
  resolveStarMadeBlockTextureId, starMadeBlockTextureOrientationCode, tileIdToStarMadeLayer,
  type BlockDefinition } from 'starmade-3d';
import type { BlockDef } from '../store/blockStore.js';

function scalar(value: unknown): unknown {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>)['#text'] : value;
}
function flag(value: unknown, fallback = false): boolean {
  const raw = scalar(value);
  return raw === undefined ? fallback : raw === true || raw === 'true' || raw === 1 || raw === '1';
}
function text(value: unknown): string { return String(scalar(value) ?? ''); }

/** Translate editable fields, including advanced XML properties, to the public native rendering contract. */
export function toRenderBlock(block: BlockDef): BlockDefinition {
  const extra = block.extraProperties;
  const injection = scalar(extra.ResourceInjection);
  return blockDefinitionFromConfig({
    id: block.id, name: block.name, hp: block.hp, textureIds: block.textureId,
    blockStyle: block.blockStyle, individualSides: block.individualSides, slab: block.slab, slabIds: block.slabIds,
    transparent: block.transparency, animated: block.animated, sideTexturesPointToOrientation: block.sideTexturesPointToOrientation,
    hasActivationTexture: block.hasActivationTexture, canActivate: block.canActivate,
    extendedTexture: block.extendedTexture4x4, drawOnlyInBuildMode: block.onlyDrawnInBuildMode,
    lightSource: block.lightSource, lightSourceColor: block.lightSourceColor, logicBlock: block.logicBlock,
    lodShape: text(extra.LodShape), lodShapeActive: text(extra.LodShapeSwitchStyleActive),
    lodShapeStyle: block.lodShapeFromFar, lodCollisionPhysical: flag(extra.LodCollisionPhysical, true),
    chamberRoot: Number(scalar(extra.ChamberRoot)),
    resourceInjection: typeof injection === 'number' || typeof injection === 'string' ? injection : undefined,
    drawLogicConnection: flag(extra.DrawLogicConnection), logicSignaledByRail: flag(extra.LogicSignaledByRail),
    logicBlockButton: flag(extra.LogicBlockButton),
  });
}

/** Native shape orientation counts, matching the encoded geometry tables. */
export function orientationCount(style: number): number { return [6, 12, 24, 6, 8, 8, 24][style] ?? 6; }

/** Read the texture of a displayed face using the same orientation mapping as the native renderer. */
export function selectedTexture(block: BlockDef, face: number, orientation: number): number {
  return resolveStarMadeBlockTextureId(toRenderBlock(block), face, orientation, true);
}

/** Assign a displayed face without conflating native top/bottom with the four shared lateral faces. */
export function assignTexture(block: BlockDef, face: number, orientation: number, tile: number): number[] {
  const ids = [...normalizeTextureIds(block.textureId, block.individualSides)];
  const slot = starMadeBlockTextureOrientationCode(toRenderBlock(block), face, orientation);
  if (block.individualSides === 1) ids.fill(tile);
  else if (block.individualSides === 3 && slot !== 2 && slot !== 3) {
    for (const index of [0, 1, 4, 5]) ids[index] = tile;
  } else ids[slot] = tile;
  return ids;
}

/** Resolve only the atlas layers used by this block, rejecting reserved IDs and animations crossing a page. */
export function requiredLayers(draft: BlockDef, orientation: number, active: boolean): number[] {
  const block = toRenderBlock(draft);
  const layout = createStarMadeCubeAtlasLayout(64);
  const layers = new Set<number>();
  for (let face = 0; face < 6; face++) {
    const tile = resolveStarMadeBlockTextureId(block, face, orientation, active);
    const layer = tileIdToStarMadeLayer(tile, layout).layer;
    if (block.animated && (block.individualSides !== 3 || (face !== 2 && face !== 3)) && tile % 256 + 3 >= 256) {
      throw new Error(`Texture animation at tile ${tile} crosses its atlas page.`);
    }
    layers.add(layer);
  }
  return [...layers].sort((a, b) => a - b);
}
