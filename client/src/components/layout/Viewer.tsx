/**
 * @fileoverview Center viewer column — 3D preview + orientation + face controls.
 *
 * The viewer column is the central panel of the three-column editor layout.
 * It contains, from top to bottom:
 *
 *  1. **BlockViewer** — the react-three-fiber 3D canvas (fills most of the column).
 *     An empty-state message is shown when no block is selected.
 *
 *  2. **Block style badge** — displays the current `blockStyle` name and index
 *     (e.g. "Wedge (style 1)") for quick visual reference.
 *
 *  3. **FaceSelector** — 6 face buttons for per-face texture tile assignment
 *     (only shown when a block is selected).
 *
 *  4. **Orientation controls** — a `<select>` dropdown plus ◄/► buttons for
 *     cycling through the valid orientations for the block's style.
 *     The maximum orientation count is taken from `ORIENTATION_COUNT` which maps
 *     each block style to the number of orientations it supports (matching
 *     `starmade_gl.js` and the StarMade engine).
 *     If the current orientation exceeds the new maximum (e.g. when changing
 *     from Wedge to Cube), it is automatically reset to 0.
 *
 *  5. **Active state preview toggle** — only shown for blocks with
 *     `lightSource = true` or `hasActivationTexture = true`.
 *     (Blocks with only `canActivate = true` do NOT have a texture state change.)
 *     Displays "Activation texture preview" or "Light preview" depending on
 *     which property enables the active state.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { BlockViewer } from '../../3d/BlockViewer.js';
import { FaceSelector } from '../editor/FaceSelector.js';
import { useBlockStore } from '../../store/blockStore.js';
import { blockStyleName } from '../../3d/geometries/index.js';
import { useT } from '../../i18n/index.js';
import { getBlockStyleName } from './propertyOptions.js';

/** Maximum orientation count per block style (from starmade_gl.js). */
const ORIENTATION_COUNT: Record<number, number> = {
  0: 6, 1: 12, 2: 24, 3: 4, 4: 6, 5: 6, 6: 6,
};

/**
 * Center viewer column.
 *
 * @component
 */
export function ViewerColumn() {
  const t              = useT();
  const draft          = useBlockStore(s => s.draft);
  const orientation    = useBlockStore(s => s.orientation);
  const setOrientation = useBlockStore(s => s.setOrientation);
  const previewActive  = useBlockStore(s => s.previewActive);
  const setPreviewActive = useBlockStore(s => s.setPreviewActive);

  const maxOrient = draft ? (ORIENTATION_COUNT[draft.blockStyle] ?? 6) : 6;
  const showActiveStatePreview =
    draft?.lightSource === true || draft?.hasActivationTexture === true;

  useEffect(() => {
    if (orientation >= maxOrient) setOrientation(0);
  }, [orientation, maxOrient, setOrientation]);

  return (
    <div className="viewer-column">
      {/* 3D viewport */}
      <div className="viewer-3d">
        <BlockViewer />
        {!draft && (
          <div className="viewer-empty">
            {t.viewer.emptyHint}
          </div>
        )}
      </div>

      {draft && (
        <>
          {/* Block style badge */}
          <div className="viewer-style-badge">
            {t.viewer.styleBadge(getBlockStyleName(draft.blockStyle, t), draft.blockStyle)}
          </div>

          {/* Face selector */}
          <FaceSelector />

          {/* Orientation controls */}
          <div className="orientation-row">
            <label>{t.viewer.orientation}</label>
            <select
              value={orientation}
              onChange={e => setOrientation(+e.target.value)}
            >
              {Array.from({ length: maxOrient }, (_, i) => (
                <option key={i} value={i}>{t.viewer.orientOption(i)}</option>
              ))}
            </select>
            <button
              onClick={() => setOrientation((orientation - 1 + maxOrient) % maxOrient)}
              title={t.viewer.prevOrientation}
            >◀</button>
            <button
              onClick={() => setOrientation((orientation + 1) % maxOrient)}
              title={t.viewer.nextOrientation}
            >▶</button>
          </div>

          {showActiveStatePreview && (
            <div className="orientation-row active-preview-row">
              <label title={t.viewer.activePreviewTooltip}>
                <input
                  type="checkbox"
                  checked={previewActive}
                  onChange={e => setPreviewActive(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                {draft.hasActivationTexture
                  ? t.viewer.activationTexturePreview
                  : t.viewer.lightPreview
                }:{' '}
                <strong>{previewActive ? t.viewer.previewOn : t.viewer.previewOff}</strong>
              </label>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPreviewActive(!previewActive)}
              >
                {t.viewer.toggle}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
