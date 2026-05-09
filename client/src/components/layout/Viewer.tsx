/**
 * @fileoverview Center viewer column component.
 *
 * Contains the 3D block viewer, face selector, and orientation controls.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React from 'react';
import { BlockViewer } from '../../3d/BlockViewer.js';
import { FaceSelector } from '../editor/FaceSelector.js';
import { useBlockStore } from '../../store/blockStore.js';
import { blockStyleName } from '../../3d/geometries/index.js';

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
  const draft         = useBlockStore(s => s.draft);
  const orientation   = useBlockStore(s => s.orientation);
  const setOrientation = useBlockStore(s => s.setOrientation);

  const maxOrient = draft ? (ORIENTATION_COUNT[draft.blockStyle] ?? 6) : 6;

  return (
    <div className="viewer-column">
      {/* 3D viewport */}
      <div className="viewer-3d">
        <BlockViewer />
        {!draft && (
          <div className="viewer-empty">
            Select a block from the list to preview it.
          </div>
        )}
      </div>

      {draft && (
        <>
          {/* Block style badge */}
          <div className="viewer-style-badge">
            {blockStyleName(draft.blockStyle)} (style {draft.blockStyle})
          </div>

          {/* Face selector */}
          <FaceSelector />

          {/* Orientation controls */}
          <div className="orientation-row">
            <label>Orientation</label>
            <select
              value={orientation}
              onChange={e => setOrientation(+e.target.value)}
            >
              {Array.from({ length: maxOrient }, (_, i) => (
                <option key={i} value={i}>Orient {i}</option>
              ))}
            </select>
            <button
              onClick={() => setOrientation((orientation - 1 + maxOrient) % maxOrient)}
              title="Previous orientation"
            >◀</button>
            <button
              onClick={() => setOrientation((orientation + 1) % maxOrient)}
              title="Next orientation"
            >▶</button>
          </div>
        </>
      )}
    </div>
  );
}
