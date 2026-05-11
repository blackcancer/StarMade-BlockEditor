/**
 * @fileoverview Face selector component — per-face texture tile picker.
 *
 * Renders 6 face buttons (FRONT / BACK / TOP / BOTTOM / RIGHT / LEFT)
 * that map to the StarMade textureId array order:
 *   index 0=FRONT, 1=BACK, 2=TOP, 3=BOTTOM, 4=RIGHT, 5=LEFT.
 *
 * ## Interaction flow
 *  1. User clicks a face button → `openPicker(face)` is called.
 *  2. `pickerFace` is set to the clicked face index.
 *  3. `highlightFace` in the block store is set, causing the 3D viewer to
 *     visually highlight that face (future: rendered face overlay).
 *  4. The `<AtlasPicker>` modal opens with the current tile ID pre-selected.
 *  5. User clicks a tile → `applyTile(tileId)` assigns it to the face.
 *  6. The assignment respects `individualSides` mode:
 *      - `1` — all 6 faces get the same tile.
 *      - `3` — groups: face<2 → [0,1], face<4 → [2,3], else [4,5].
 *      - `6` — only the clicked face is updated.
 *  7. The picker closes and `highlightFace` resets to -1.
 *
 * A "Manage custom atlas…" button opens the AtlasPicker in manager-only mode
 * (no tile selection) so the user can import a custom atlas without changing a face.
 *
 * The hint line below the grid shows the current `individualSides` mode and
 * relevant texture behaviour flags (`hasActivationTexture`, `animated`).
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useBlockStore } from '../../store/blockStore.js';
import { AtlasPicker } from './AtlasPicker.js';

/** Face labels in textureId array order. */
const FACE_LABELS = ['FRONT', 'BACK', 'TOP', 'BOTTOM', 'RIGHT', 'LEFT'] as const;
type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Face selector UI with atlas picker integration.
 *
 * @component
 */
export function FaceSelector() {
  const draft          = useBlockStore(s => s.draft);
  const updateDraft    = useBlockStore(s => s.updateDraft);
  const highlightFace  = useBlockStore(s => s.highlightFace);
  const setHighlightFace = useBlockStore(s => s.setHighlightFace);
  const [pickerFace, setPickerFace] = useState<FaceIndex | null>(null);
  const [atlasManagerOpen, setAtlasManagerOpen] = useState(false);

  if (!draft) return null;

  // Current tile IDs — normalise to 6 entries
  const tileIds: number[] = Array.from({ length: 6 }, (_, i) => draft.textureId[i] ?? draft.textureId[0] ?? 0);

  /** Open the atlas picker for a face. */
  const openPicker = (face: FaceIndex) => {
    setPickerFace(face);
    setHighlightFace(face);
  };

  const assignTileToFace = (face: FaceIndex, tileId: number) => {
    const newIds = [...tileIds];

    // Respect individualSides mode
    if (draft.individualSides === 1) {
      newIds.fill(tileId);
    } else if (draft.individualSides === 3) {
      // 0=front/back, 1=top/bottom, 2=right/left
      /* c8 ignore next */
      const group = face < 2 ? [0, 1] : face < 4 ? [2, 3] : [4, 5];
      group.forEach(i => { newIds[i] = tileId; });
    } else {
      newIds[face] = tileId;
    }

    updateDraft({ textureId: newIds });
  };

  /** Apply a new tile ID to the selected face. */
  const applyTile = (tileId: number) => {
    assignTileToFace(pickerFace!, tileId);
    setPickerFace(null);
  };

  return (
    <>
      <div className="face-selector">
        <div className="face-selector-label">Texture faces</div>
        <div className="face-selector-grid">
          {FACE_LABELS.map((label, i) => (
            <button
              key={i}
              className={`face-btn ${highlightFace === i ? 'active' : ''}`}
              onClick={() => openPicker(i as FaceIndex)}
              title={label}
            >
              <span className="face-btn-label">{label}</span>
            </button>
          ))}
        </div>
        <div className="face-import-row">
          <button type="button" className="btn-secondary" onClick={() => setAtlasManagerOpen(true)}>
            Manage custom atlas…
          </button>
        </div>
        <div className="face-selector-hint">
          Click a face to change its texture tile.
          {draft.individualSides === 1 && ' (All faces share one tile)'}
          {draft.individualSides === 3 && ' (3-group: front/back · top/bottom · sides)'}
          {draft.individualSides === 6 && ' (6 independent faces)'}
          {draft.hasActivationTexture && ' Inactive preview uses the tile immediately to the right (+1), like the engine active-state texture path.'}
          {draft.animated && ' Animated preview cycles a 4-tile texture range every 0.5s.'}
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
          selectedTileId={tileIds[pickerFace]}
          onSelect={applyTile}
          onClose={() => { setPickerFace(null); setHighlightFace(-1); }}
        />
      )}
    </>
  );
}
