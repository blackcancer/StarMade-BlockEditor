/**
 * @fileoverview Atlas picker modal — visual texture tile selector.
 *
 * Displays the full composite atlas (64×32 tiles) as a clickable canvas,
 * allowing the user to select a tile ID for face texture assignment or to
 * manage the custom texture atlas (import / replace).
 *
 * ## Two operating modes
 *
 * ### Picker mode (when `onSelect` is provided)
 * The user sees the atlas grid and clicks a tile to select it.
 * The selected tile is highlighted; hovering shows a hover indicator.
 * Clicking fires `onSelect(tileId)` then `onClose()`.
 * A footer hint reads: “Click a tile to select · Escape to close”.
 *
 * ### Manager mode (when `onSelect` is omitted)
 * The user can import a full custom atlas or replace individual tiles.
 * Clicking a tile in the custom zone (page 7, IDs 1792–2047) updates the
 * `customSlot` state for the tile importer.
 * Footer shows import controls:
 *  - Map kind selector (diffuse / normal)
 *  - “Import full custom atlas…” — uploads to `PUT /api/textures/custom-atlas`
 *  - Advanced: “Replace selected tile…” — uploads to `PUT /api/textures/custom-tile/:id`
 *
 * ## Canvas rendering
 * The atlas grid is drawn onto a `<canvas>` by loading the composite atlas
 * PNG from the API and drawing each tile cell with a faint 0.5px grid stroke.
 * The canvas re-renders when `atlasSize`, `texturePack`, or `atlasVersion`
 * (incremented after each import) changes.
 *
 * Selected and hovered tiles are shown as CSS-positioned overlay `<div>` elements
 * (not drawn on the canvas) to avoid full canvas redraws on mouse move.
 *
 * ## Keyboard close
 * Escape uses the native dialog cancel event and restores focus to the opener.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useConfigStore } from '../../store/configStore.js';
import { ATLAS_COLS, ATLAS_ROWS, PAGE_COLS, PAGE_ROWS, PAGE_TILES, PAGE_GRID_COLS } from '../../3d/geometries/index.js';
import { useT } from '../../i18n/index.js';
import { useModal } from '../../hooks/useModal.js';
import { localizeMessage, technicalDetail } from '../../i18n/messages.js';

const DISPLAY_TILE = 48; // px per tile in the picker grid

interface AtlasPickerProps {
  /** Currently selected tile ID. */
  selectedTileId: number;
  /** Called when the user clicks a tile. If omitted, picker only manages the custom atlas. */
  onSelect?: (tileId: number) => void;
  /** Called when the picker should close (click outside or Escape). */
  onClose: () => void;
}

/**
 * Interactive atlas modal used for both tile selection and custom atlas management.
 *
 * When `onSelect` is present the modal acts as a face-texture picker and converts canvas coordinates into StarMade tile IDs. Without `onSelect` it becomes the custom atlas manager, exposing full-atlas import and individual custom-tile replacement while invalidating atlas caches after successful writes.
 *
 * @param props.selectedTileId Currently selected StarMade tile ID.
 * @param props.onSelect Optional callback enabling picker mode.
 * @param props.onClose Callback used by Escape, backdrop close, and successful selection.
 * @returns Atlas picker or manager overlay.
 */

export function AtlasPicker({ selectedTileId, onSelect, onClose }: AtlasPickerProps) {
  const t           = useT();
  const [error, setError] = useState<string | null>(null);
  const detail = error && technicalDetail(error, t);
  const modal = useModal();
  const atlasSize   = useConfigStore(s => s.atlasSize);
  const texturePack = useConfigStore(s => s.texturePack);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tileFileInputRef = useRef<HTMLInputElement>(null);
  const [hoveredTile, setHoveredTile] = useState(-1);
  const [customSlot, setCustomSlot] = useState(selectedTileId >= PAGE_TILES * 7 ? selectedTileId - PAGE_TILES * 7 : 0);
  const [mapKind, setMapKind] = useState<'diffuse' | 'normal'>('diffuse');
  const [importing, setImporting] = useState(false);
  const [atlasVersion, setAtlasVersion] = useState(0);

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
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.src   = `/api/textures/atlas?size=${atlasSize}&pack=${encodeURIComponent(texturePack)}&v=3&refresh=${atlasVersion}`;

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
  }, [atlasSize, texturePack, atlasVersion]);

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

  const refreshAtlas = () => {

    window.dispatchEvent(new CustomEvent('atlas-imported'));
    // Increment local version so the canvas redraws immediately in this modal
    setAtlasVersion(v => v + 1);
  };

  const importCustomAtlas = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const res = await fetch(`/api/textures/custom-atlas?size=${atlasSize}&map=${mapKind}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      refreshAtlas();
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const importCustomTile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    const targetTile = PAGE_TILES * 7 + Math.max(0, Math.min(PAGE_TILES - 1, customSlot));
    setImporting(true);
    try {
      const res = await fetch(`/api/textures/custom-tile/${targetTile}?size=${atlasSize}&map=${mapKind}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      refreshAtlas();
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);

      if (tileFileInputRef.current) tileFileInputRef.current.value = '';
    }
  };

  return (
    <dialog ref={modal} className="atlas-picker-overlay" aria-label={onSelect ? t.atlasPicker.titlePick : t.atlasPicker.titleManager}
      onClick={onClose} onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="atlas-picker-modal" onClick={e => e.stopPropagation()}>
        {error && <div className="properties-error" role="alert">{localizeMessage(error, t)}
          {detail && <details><summary>{t.errors.technicalDetails}</summary><div>{detail}</div></details>}
        </div>}
        <div className="atlas-picker-header">
          <span>{onSelect ? t.atlasPicker.titlePick : t.atlasPicker.titleManager}</span>
          <button autoFocus onClick={onClose} aria-label={t.atlasPicker.closeLabel}>{t.atlasPicker.close}</button>
        </div>
        <div className="atlas-picker-canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label={t.atlasPicker.titlePick}
            style={{ cursor: 'crosshair', display: 'block' }}
            onMouseMove={e => {
              const nextTile = tileFromEvent(e);
              setHoveredTile(prev => (prev === nextTile ? prev : nextTile));
            }}
            onMouseLeave={() => setHoveredTile(-1)}
            onClick={e => {
              const id = tileFromEvent(e);
              if (id < 0) return;
              if (onSelect) {
                onSelect(id);
                onClose();
              } else if (id >= PAGE_TILES * 7 && id < PAGE_TILES * 8) {
                setCustomSlot(id - PAGE_TILES * 7);
              }
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
        <div className="atlas-picker-footer atlas-manager-footer">
          {onSelect ? (
            <span>{t.atlasPicker.hintPick}</span>
          ) : (
            <>
              {/* Reload button — invalidates cache so 3D view picks up new textures */}
              <button
                type="button"
                className="btn-secondary"
                onClick={refreshAtlas}
                disabled={importing}
              >
                ↺ {t.atlasPicker.reload}
              </button>
              <span>{t.atlasPicker.importAtlasDesc(PAGE_COLS * atlasSize, PAGE_COLS, PAGE_ROWS)}</span>
              <select value={mapKind} onChange={e => setMapKind(e.target.value as 'diffuse' | 'normal')}>
                <option value="diffuse">{t.atlasPicker.mapDiffuse}</option>
                <option value="normal">{t.atlasPicker.mapNormal}</option>
              </select>
              <button type="button" className="btn-secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                {importing ? t.atlasPicker.importing : t.atlasPicker.importFull}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={e => importCustomAtlas(e.target.files?.[0] ?? null)}
              />
              <details className="atlas-tile-import-details">
                <summary>{t.atlasPicker.advancedSummary}</summary>
                <label>
                  {t.atlasPicker.slotLabel}
                  <input
                    type="number"
                    min={0}
                    max={PAGE_TILES - 1}
                    value={customSlot}

                    onChange={e => setCustomSlot(Math.max(0, Math.min(PAGE_TILES - 1, +e.target.value || 0)))}
                  />
                </label>
                <button type="button" className="btn-secondary" disabled={importing} onClick={() => tileFileInputRef.current?.click()}>
                  {t.atlasPicker.replaceTile}
                </button>
                <input
                  ref={tileFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => importCustomTile(e.target.files?.[0] ?? null)}
                />
              </details>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
