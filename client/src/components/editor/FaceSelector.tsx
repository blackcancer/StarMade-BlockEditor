/**
 * @fileoverview Edit the six displayed block faces through StarMade's native orientation mapping.
 * Single-side mode shares all faces; three-side mode separates top, bottom and the four lateral faces.
 * The native adapter expands sparse texture arrays and maps displayed sides back to stored slots.
 * Selection highlights the corresponding native surface while the atlas picker is open.
 */

import React, { useState } from 'react';
import { useBlockStore } from '../../store/blockStore.js';
import { AtlasPicker } from './AtlasPicker.js';
import { useT } from '../../i18n/index.js';
import { assignTexture, selectedTexture } from '../../3d/renderBlock.js';

/**
 * Face labels in textureId array order — localised via useT().
 * The keys in the `face` locale correspond to these indices:
 *   0=front, 1=back, 2=top, 3=bottom, 4=right, 5=left
 */
const FACE_KEYS = ['front', 'back', 'top', 'bottom', 'right', 'left'] as const;
type FaceKey = typeof FACE_KEYS[number];
type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Face texture editor shown below the 3D preview.
 *
 * The selector maps `IndividualSides` mode to the correct editable face buttons, opens the atlas picker for the chosen logical face, and writes selected tile IDs back into the active draft. It also provides access to the custom atlas manager from the texture-editing workflow.
 *
 * @returns Face controls and atlas modal state for the active draft, or `null` when no block is selected.
 */

export function FaceSelector() {
  const t              = useT();
  const draft          = useBlockStore(s => s.draft);
  const updateDraft    = useBlockStore(s => s.updateDraft);
  const highlightFace  = useBlockStore(s => s.highlightFace);
  const orientation = useBlockStore(s => s.orientation);
  const setHighlightFace = useBlockStore(s => s.setHighlightFace);
  const [pickerFace, setPickerFace] = useState<FaceIndex | null>(null);
  const [atlasManagerOpen, setAtlasManagerOpen] = useState(false);

  if (!draft) return null;

  /** Open the atlas picker for a face. */
  const openPicker = (face: FaceIndex) => {
    setPickerFace(face);
    setHighlightFace(face);
  };

  const assignTileToFace = (face: FaceIndex, tileId: number) => {
    updateDraft({ textureId: assignTexture(draft, face, orientation, tileId) });
  };

  /** Apply a new tile ID to the selected face. */
  const applyTile = (tileId: number) => {
    assignTileToFace(pickerFace!, tileId);
    setPickerFace(null);
    setHighlightFace(-1);
  };

  return (
    <>
      <div className="face-selector">
        <div className="face-selector-label">{t.faceSelector.label}</div>
        <div className="face-selector-grid">
          {FACE_KEYS.map((key, i) => {
            const label = t.face[key as FaceKey];
            return (
              <button
                key={i}
                className={`face-btn ${highlightFace === i ? 'active' : ''}`}
                onClick={() => openPicker(i as FaceIndex)}
                title={label}
              >
                <span className="face-btn-label">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="face-import-row">
          <button type="button" className="btn-secondary" onClick={() => setAtlasManagerOpen(true)}>
            {t.faceSelector.manageatlas}
          </button>
        </div>
        <div className="face-selector-hint">
          {t.faceSelector.hint}
          {draft.individualSides === 1 && t.faceSelector.hintAllSame}
          {draft.individualSides === 3 && t.faceSelector.hintGrouped}
          {draft.individualSides === 6 && t.faceSelector.hintIndependent}
          {draft.hasActivationTexture && t.faceSelector.hintActivation}
          {draft.animated && t.faceSelector.hintAnimated}
        </div>
      </div>

      {atlasManagerOpen && (
        <AtlasPicker
          selectedTileId={1792}
          onClose={() => setAtlasManagerOpen(false)}
        />
      )}

      {pickerFace !== null && (
        <AtlasPicker
          selectedTileId={selectedTexture(draft, pickerFace, orientation)}
          onSelect={applyTile}
          onClose={() => { setPickerFace(null); setHighlightFace(-1); }}
        />
      )}
    </>
  );
}
