/** @fileoverview Installation-backed native Display screen/text pass and its owned browser resources. */
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { createStarMadeDisplayPanel } from 'starmade-3d';

/** Load the native screen and Monda font, then create an orientation-correct preview with sample text. */
export async function loadDisplayPreview(orientation: number) {
  let font: FontFace | undefined;
  let background: Texture | undefined;
  const disposeAssets = () => {
    background?.dispose();
    if (font) document.fonts.delete(font);
  };
  try {
    const response = await fetch('/api/render-assets/display/font');
    if (!response.ok) throw new Error(`Display font unavailable: HTTP ${response.status}`);
    font = await new FontFace('StarMadeDisplay', await response.arrayBuffer()).load();
    document.fonts.add(font);
    background = await new TextureLoader().loadAsync('/api/render-assets/display/screen');
    background.colorSpace = SRGBColorSpace;
    const panel = createStarMadeDisplayPanel({ position: [0, 0, 0], orientation, background,
      fontFamily: 'StarMadeDisplay', createCanvas: () => document.createElement('canvas'), text: 'Display' });
    return { ...panel, dispose() { panel.dispose(); disposeAssets(); } };
  } catch (error) { disposeAssets(); throw error; }
}
