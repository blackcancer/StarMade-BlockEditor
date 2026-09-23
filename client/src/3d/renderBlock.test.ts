import { describe, expect, it } from 'vitest';
import { createStarMadeEncodedCubeGeometry } from 'starmade-3d';
import type { BlockDef } from '../store/blockStore.js';
import { toRenderBlock, orientationCount, selectedTexture, assignTexture, requiredLayers } from './renderBlock.js';

const draft = (patch: Partial<BlockDef> = {}) => ({
  id: 1, name: 'Hull', hp: 255, blockStyle: 0, textureId: [10, 11, 12, 13, 14, 15],
  individualSides: 6, transparency: false, animated: false, slab: 0, slabIds: [],
  sideTexturesPointToOrientation: false, hasActivationTexture: false, canActivate: false,
  extendedTexture4x4: false, onlyDrawnInBuildMode: false, lodShapeFromFar: 0,
  lightSource: false, lightSourceColor: [1, 1, 1, 1], logicBlock: false, extraProperties: {},
  ...patch,
} as BlockDef);

describe('current editor draft to native block contract', () => {
  it('maps mutable draft fields and advanced XML fields without changing the draft', () => {
    const input = draft({ transparency: true, extendedTexture4x4: true, onlyDrawnInBuildMode: true,
      extraProperties: { LodShape: 'desk', LodShapeSwitchStyleActive: 'desk-on', LodCollisionPhysical: false,
        ChamberRoot: 1, ResourceInjection: 'ore', DrawLogicConnection: true, LogicSignaledByRail: true, LogicBlockButton: true } });
    const before = JSON.stringify(input);
    expect(toRenderBlock(input)).toMatchObject({ textureIds: input.textureId, transparent: true,
      extendedTexture: true, drawOnlyInBuildMode: true, lodShape: 'desk', lodShapeActive: 'desk-on',
      lodCollisionPhysical: false, reactorChamberSpecific: true, resourceInjection: 'ore',
      drawLogicConnection: true, logicSignaledByRail: true, logicBlockButton: true });
    expect(JSON.stringify(input)).toBe(before);
    expect(toRenderBlock(draft())).toMatchObject({ lodShape: '', lodShapeActive: '', lodCollisionPhysical: true });
  });

  it('accepts scalar XML wrapper values and normalizes missing optional advanced values', () => {
    expect(toRenderBlock(draft({ extraProperties: { LodShape: { '#text': 'desk' },
      LodCollisionPhysical: 'false', ResourceInjection: 17, ChamberRoot: '0', DrawLogicConnection: 'true' } })))
      .toMatchObject({ lodShape: 'desk', lodCollisionPhysical: false, resourceInjection: 'flora',
        reactorChamberSpecific: false, drawLogicConnection: true });
  });

  it.each([[0, 6], [1, 12], [2, 24], [3, 6], [4, 8], [5, 8], [6, 24], [99, 6]])
    ('exposes the native orientation range for style %i', (style, count) => expect(orientationCount(style)).toBe(count));

  it('constructs actual native encoded geometry for every style and slab', () => {
    for (let style = 0; style <= 6; style++) for (let slab = 0; slab <= 3; slab++) {
      const geometry = createStarMadeEncodedCubeGeometry({ block: toRenderBlock(draft({ blockStyle: style, slab })), orientation: 0 });
      expect(geometry.getAttribute('ivert').count).toBeGreaterThan(0);
      expect(geometry.boundingBox!.isEmpty()).toBe(false);
      geometry.dispose();
    }
  });

  it('resolves displayed faces through native orientation and expands sparse texture arrays', () => {
    expect(selectedTexture(draft(), 4, 0)).toBe(15);
    expect(selectedTexture(draft(), 4, 1)).toBe(14);
    expect(selectedTexture(draft({ textureId: [42] }), 1, 0)).toBe(43);
    expect(selectedTexture(draft({ textureId: [] }), 2, 0)).toBe(2);
  });

  it('edits independent, shared, top and bottom native texture groups', () => {
    expect(assignTexture(draft(), 4, 0, 99)).toEqual([10, 11, 12, 13, 14, 99]);
    expect(assignTexture(draft({ individualSides: 1 }), 4, 0, 99)).toEqual([99, 99, 99, 99, 99, 99]);
    expect(assignTexture(draft({ individualSides: 3 }), 2, 0, 99)).toEqual([10, 11, 99, 13, 14, 15]);
    expect(assignTexture(draft({ individualSides: 3 }), 3, 0, 99)).toEqual([10, 11, 12, 99, 14, 15]);
    expect(assignTexture(draft({ individualSides: 3 }), 0, 0, 99)).toEqual([99, 99, 12, 13, 99, 99]);
  });

  it('loads native layers needed by current faces, including custom and inactive textures', () => {
    expect(requiredLayers(draft({ textureId: [0, 256, 512, 768, 1792, 1] }), 0, true)).toEqual([0, 1, 2, 3, 7]);
    expect(requiredLayers(draft({ textureId: [255], individualSides: 1, hasActivationTexture: true }), 0, false)).toEqual([1]);
    expect(requiredLayers(draft({ textureId: [10], individualSides: 3, animated: true }), 0, true)).toEqual([0]);
    expect(() => requiredLayers(draft({ textureId: [1024], individualSides: 1 }), 0, true)).toThrow(/atlas/);
    expect(() => requiredLayers(draft({ textureId: [254], individualSides: 1, animated: true }), 0, true)).toThrow(/animation/i);
  });
});
