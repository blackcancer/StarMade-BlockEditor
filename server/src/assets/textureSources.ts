/** @fileoverview Maps native StarMade texture layers to confined installation sources. */
import { confinedPath } from './assetPaths.js';
import { findNativeImage, type NativeImage } from './nativeImage.js';

/** Resolve eight logical atlas slots, preserving the reserved slots and optional custom layer. */
export function atlasSources(root: string, size: number, pack: string, map: 'diffuse' | 'normal'): Array<NativeImage | null> {
  const normal = map === 'normal';
  const suffix = normal ? '_NRM' : '';
  const directory = confinedPath(root, `data/textures/block/${pack}/${size}`);
  const custom = confinedPath(root, `customBlockTextures/${size}`);
  // Editor imports write PNG; a retained native archive must not hide that editable source.
  const customSource = findNativeImage(custom, `custom${suffix}.png`);
  if (customSource) customSource.normal = normal;
  return [0, 1, 2, 3].map(layer => findNativeImage(directory, `t00${layer}${suffix}.png`, normal))
    .concat([null, null, null, customSource]);
}

/** Resolve the pack overlay image without injecting a synthetic replacement. */
export function overlaySource(root: string, size: number, pack: string): NativeImage | null {
  return findNativeImage(confinedPath(root, `data/textures/block/${pack}/${size}`), 'overlays.png');
}
