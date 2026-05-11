/**
 * @fileoverview Center viewer column — 3D preview + orientation + face controls.
 *
 * The viewer column is the central panel of the three-column editor layout.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { BlockViewer } from '../../3d/BlockViewer.js';
import { FaceSelector } from '../editor/FaceSelector.js';
import { useBlockStore } from '../../store/blockStore.js';
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

  // Reset orientation when switching to a style with fewer orientations
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

          {/* Active state preview toggle — single button replacing checkbox+button duo.
              Shown only for blocks with lightSource or hasActivationTexture.
              canActivate alone does NOT have a texture state change. */}
          {showActiveStatePreview && (
            <div className="orientation-row active-preview-row">
              <button
                type="button"
                className={`btn-toggle ${previewActive ? 'active' : ''}`}
                title={t.viewer.activePreviewTooltip}
                onClick={() => setPreviewActive(!previewActive)}
              >
                {draft.hasActivationTexture
                  ? t.viewer.activationTexturePreview
                  : t.viewer.lightPreview
                }
                {': '}
                <strong>{previewActive ? t.viewer.previewOn : t.viewer.previewOff}</strong>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
