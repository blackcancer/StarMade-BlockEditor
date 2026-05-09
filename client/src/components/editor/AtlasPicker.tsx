/**
 * @fileoverview Atlas picker modal.
 *
 * Shows the 16×16 texture atlas as a clickable grid.
 * Clicking a tile returns its ID to the caller.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useConfigStore } from '../../store/configStore.js';
import { ATLAS_COLS, ATLAS_ROWS } from '../../3d/geometries/index.js';

const DISPLAY_TILE = 48; // px per tile in the picker grid

interface AtlasPickerProps {
  /** Currently selected tile ID. */
  selectedTileId: number;
  /** Called when the user clicks a tile. */
  onSelect: (tileId: number) => void;
  /** Called when the picker should close (click outside or Escape). */
  onClose: () => void;
}

/**
 * Atlas picker overlay component.
 *
 * @component
 */
export function AtlasPicker({ selectedTileId, onSelect, onClose }: AtlasPickerProps) {
  const atlasSize = useConfigStore(s => s.atlasSize);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState(-1);

  // ── Draw the atlas grid onto canvas ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src   = `/api/textures/atlas?size=${atlasSize}`;
    img.onload = () => {
      canvas.width  = ATLAS_COLS * DISPLAY_TILE;
      canvas.height = ATLAS_ROWS * DISPLAY_TILE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all tiles
      for (let row = 0; row < ATLAS_ROWS; row++) {
        for (let col = 0; col < ATLAS_COLS; col++) {
          const tileId = row * ATLAS_COLS + col;
          const sx = col * atlasSize;
          const sy = row * atlasSize;
          const dx = col * DISPLAY_TILE;
          const dy = row * DISPLAY_TILE;
          ctx.drawImage(img, sx, sy, atlasSize, atlasSize, dx, dy, DISPLAY_TILE, DISPLAY_TILE);

          // Grid lines
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth   = 0.5;
          ctx.strokeRect(dx, dy, DISPLAY_TILE, DISPLAY_TILE);

          // Highlight selected tile
          if (tileId === selectedTileId) {
            ctx.fillStyle = 'rgba(59,158,255,0.45)';
            ctx.fillRect(dx, dy, DISPLAY_TILE, DISPLAY_TILE);
            ctx.strokeStyle = '#3b9eff';
            ctx.lineWidth   = 2;
            ctx.strokeRect(dx + 1, dy + 1, DISPLAY_TILE - 2, DISPLAY_TILE - 2);
          }

          // Highlight hovered tile
          if (tileId === hoveredTile && tileId !== selectedTileId) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(dx, dy, DISPLAY_TILE, DISPLAY_TILE);
          }
        }
      }
    };
  }, [atlasSize, selectedTileId, hoveredTile]);

  // ── Hit-test helpers ─────────────────────────────────────────────────────
  const tileFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left)  / DISPLAY_TILE);
    const row  = Math.floor((e.clientY - rect.top)   / DISPLAY_TILE);
    if (col < 0 || col >= ATLAS_COLS || row < 0 || row >= ATLAS_ROWS) return -1;
    return row * ATLAS_COLS + col;
  }, []);

  // ── Keyboard close ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="atlas-picker-overlay" onClick={onClose}>
      <div className="atlas-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="atlas-picker-header">
          <span>Texture Atlas — tile {selectedTileId}</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="atlas-picker-canvas-wrap">
          <canvas
            ref={canvasRef}
            style={{ cursor: 'crosshair', display: 'block' }}
            onMouseMove={e => setHoveredTile(tileFromEvent(e))}
            onMouseLeave={() => setHoveredTile(-1)}
            onClick={e => {
              const id = tileFromEvent(e);
              if (id >= 0) { onSelect(id); onClose(); }
            }}
          />
        </div>
        <div className="atlas-picker-footer">
          Click a tile to select · Escape to close · Tile {hoveredTile >= 0 ? hoveredTile : '—'}
        </div>
      </div>
    </div>
  );
}
