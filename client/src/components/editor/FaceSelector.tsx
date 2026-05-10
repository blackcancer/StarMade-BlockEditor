/**
 * @fileoverview Face selector component.
 *
 * Shows 6 face buttons (FRONT/BACK/TOP/BOTTOM/RIGHT/LEFT).
 * Clicking a face opens the AtlasPicker to change its texture tile.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useRef, useState } from 'react';
import { useBlockStore } from '../../store/blockStore.js';
import { useConfigStore } from '../../store/configStore.js';
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
  const atlasSize = useConfigStore(s => s.atlasSize);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pickerFace, setPickerFace] = useState<FaceIndex | null>(null);
  const [importFace, setImportFace] = useState<FaceIndex>(0);
  const [importing, setImporting] = useState(false);

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
      const group = face < 2 ? [0, 1] : face < 4 ? [2, 3] : [4, 5];
      group.forEach(i => { newIds[i] = tileId; });
    } else {
      newIds[face] = tileId;
    }

    updateDraft({ textureId: newIds });
  };

  /** Apply a new tile ID to the selected face. */
  const applyTile = (tileId: number) => {
    if (pickerFace === null) return;
    assignTileToFace(pickerFace, tileId);
    setPickerFace(null);
  };

  const importTexture = async (file: File | null) => {
    if (!file) return;
    const baseTile = tileIds[importFace] ?? 0;
    const targetTile = 1792 + (baseTile % 256);
    setImporting(true);
    try {
      const res = await fetch(`/api/textures/custom-tile/${targetTile}?size=${atlasSize}&map=diffuse`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      assignTileToFace(importFace, targetTile);
    } catch (e) {
      alert(`Texture import failed: ${e}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
          <select value={importFace} onChange={e => setImportFace(+e.target.value as FaceIndex)}>
            {FACE_LABELS.map((label, i) => <option key={label} value={i}>{label}</option>)}
          </select>
          <button type="button" className="btn-secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? 'Importing…' : 'Import texture → custom atlas'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={e => importTexture(e.target.files?.[0] ?? null)}
          />
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
