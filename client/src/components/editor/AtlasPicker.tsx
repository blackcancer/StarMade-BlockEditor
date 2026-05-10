/**
 * @fileoverview Atlas picker modal.
 *
 * Shows the 16×16 texture atlas as a clickable grid.
 * Clicking a tile returns its ID to the caller.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useConfigStore } from '../../store/configStore.js';
import { ATLAS_COLS, ATLAS_ROWS, PAGE_COLS, PAGE_ROWS, PAGE_TILES, PAGE_GRID_COLS } from '../../3d/geometries/index.js';

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
  const atlasSize   = useConfigStore(s => s.atlasSize);
  const texturePack = useConfigStore(s => s.texturePack);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState(-1);

  const tileRect = useCallback((tileId: number) => {
    if (tileId < 0) return null;
    const pageIndex = Math.floor(tileId / PAGE_TILES);
    const pageCol = pageIndex % PAGE_GRID_COLS;
    const pageRow = Math.floor(pageIndex / PAGE_GRID_COLS);
    const localIndex = tileId % PAGE_TILES;
    const localCol = localIndex % PAGE_COLS;
    const localRow = Math.floor(localIndex / PAGE_COLS);
    return {
      left: (pageCol * PAGE_COLS + localCol) * DISPLAY_TILE,
      top: (pageRow * PAGE_ROWS + localRow) * DISPLAY_TILE,
    };
  }, []);

  const selectedRect = useMemo(() => tileRect(selectedTileId), [selectedTileId, tileRect]);
  const hoveredRect = useMemo(() => tileRect(hoveredTile), [hoveredTile, tileRect]);

  // ── Draw the atlas grid onto canvas ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src   = `/api/textures/atlas?size=${atlasSize}&pack=${encodeURIComponent(texturePack)}&v=3`;
    img.onload = () => {
      canvas.width  = ATLAS_COLS * DISPLAY_TILE;
      canvas.height = ATLAS_ROWS * DISPLAY_TILE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      for (let row = 0; row < ATLAS_ROWS; row++) {
        for (let col = 0; col < ATLAS_COLS; col++) {
          const sx = col * atlasSize;
          const sy = row * atlasSize;
          const dx = col * DISPLAY_TILE;
          const dy = row * DISPLAY_TILE;
          ctx.drawImage(img, sx, sy, atlasSize, atlasSize, dx, dy, DISPLAY_TILE, DISPLAY_TILE);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth   = 0.5;
          ctx.strokeRect(dx, dy, DISPLAY_TILE, DISPLAY_TILE);
        }
      }
    };
  }, [atlasSize, texturePack]);

  // ── Hit-test helpers ─────────────────────────────────────────────────────
  const tileFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left)  / DISPLAY_TILE);
    const row  = Math.floor((e.clientY - rect.top)   / DISPLAY_TILE);
    if (col < 0 || col >= ATLAS_COLS || row < 0 || row >= ATLAS_ROWS) return -1;
    const pageCol = Math.floor(col / PAGE_COLS);
    const pageRow = Math.floor(row / PAGE_ROWS);
    const localCol = col % PAGE_COLS;
    const localRow = row % PAGE_ROWS;
    return (pageRow * PAGE_GRID_COLS + pageCol) * PAGE_TILES + localRow * PAGE_COLS + localCol;
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
            onMouseMove={e => {
              const nextTile = tileFromEvent(e);
              setHoveredTile(prev => (prev === nextTile ? prev : nextTile));
            }}
            onMouseLeave={() => setHoveredTile(-1)}
            onClick={e => {
              const id = tileFromEvent(e);
              if (id >= 0) { onSelect(id); onClose(); }
            }}
          />
          {selectedRect && (
            <div
              className="atlas-picker-selected"
              style={{ left: selectedRect.left, top: selectedRect.top, width: DISPLAY_TILE, height: DISPLAY_TILE }}
            />
          )}
          {hoveredRect && hoveredTile !== selectedTileId && (
            <div
              className="atlas-picker-hovered"
              style={{ left: hoveredRect.left, top: hoveredRect.top, width: DISPLAY_TILE, height: DISPLAY_TILE }}
            />
          )}
        </div>
        <div className="atlas-picker-footer">
          Click a tile to select · Escape to close · Tile {hoveredTile >= 0 ? hoveredTile : '—'}
        </div>
      </div>
    </div>
  );
}
