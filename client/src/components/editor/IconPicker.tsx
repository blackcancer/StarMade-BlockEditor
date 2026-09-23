/**
 * @fileoverview Build icon picker modal.
 *
 * Allows the user to select a StarMade build-menu icon for the selected block.
 *
 * ## Icon system
 * StarMade stores build icons in numbered sprite sheets:
 *   `data/image-resource/build-icons-NN-16x16-gui-.png`
 * where `NN = Math.floor(iconId / 256)` (zero-padded to 2 digits).
 *
 * Each sheet is a 1024×1024 sprite atlas with 16×16 = 256 icon slots.
 * Each slot is 64×64 px in the PNG. The editor renders 6 sheets side-by-side
 * in a 3-column grid (2 rows of 3 sheets = 1536 icons visible).
 *
 * ## Canvas rendering
 * All 6 icon sheets are loaded from `/api/textures/icons/sheet/:layer` and
 * drawn onto a single `<canvas>` at 36 px per icon. The canvas is populated
 * once on mount (sheets load asynchronously via `img.onload`).
 *
 * Selected and hovered icons are shown as CSS-positioned overlay `<div>`
 * elements (class `atlas-picker-selected` / `atlas-picker-hovered`).
 *
 * ## Hit testing
 * `iconFromEvent` maps a mouse click to an icon ID by:
 *  1. Computing `col = floor((x - left) / displayIcon)` and
 *     `row = floor((y - top) / displayIcon)`.
 *  2. Determining the sheet (`sheetRow * 3 + sheetCol`) and local slot
 *     (`localRow * 16 + localCol`).
 *  3. Returning `sheet * 256 + localRow * 16 + localCol`.
 *
 * ## Keyboard close
 * Escape uses the native dialog cancel event, with focus restored to its opener.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlockStore } from '../../store/blockStore.js';
import { useT } from '../../i18n/index.js';
import { useModal } from '../../hooks/useModal.js';
import { useCompactLayout } from '../layout/MobileNavigation.js';

const ICON_SHEETS = 6;
const SHEET_COLS = 16;
const SHEET_ROWS = 16;
const ICONS_PER_SHEET = SHEET_COLS * SHEET_ROWS;
const SHEET_GRID_COLS = 3;
const ICON_SOURCE_SIZE = 64;


interface IconPickerProps {
  selectedIconId: number;
  onSelect: (iconId: number) => void;
  onClose: () => void;
}
/**
 * Build-icon picker modal backed by StarMade icon atlas endpoints.
 *
 * The component displays icon sheets, maps pointer positions to numeric `buildIconNum` values, and supports custom icon import. It mirrors the atlas picker interaction model so icon and texture selection behave consistently.
 *
 * @param props.selectedIcon Current icon ID stored on the block draft.
 * @param props.onSelect Called with the selected icon ID.
 * @param props.onClose Called when the modal is dismissed.
 * @returns Icon picker overlay and hidden import input.
 */

export function IconPicker({ selectedIconId, onSelect, onClose }: IconPickerProps) {
  const t = useT();
  const modal = useModal();
  const displayIcon = useCompactLayout() ? 44 : 36;
  const iconRevision = useBlockStore(s => s.iconRevision);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIcon, setHoveredIcon] = useState(-1);

  const iconRect = useCallback((iconId: number) => {
    if (iconId < 0) return null;
    const sheet = Math.floor(iconId / ICONS_PER_SHEET);
    if (sheet >= ICON_SHEETS) return null;
    const sheetCol = sheet % SHEET_GRID_COLS;
    const sheetRow = Math.floor(sheet / SHEET_GRID_COLS);
    const local = iconId % ICONS_PER_SHEET;
    const localCol = local % SHEET_COLS;
    const localRow = Math.floor(local / SHEET_COLS);
    return {
      left: (sheetCol * SHEET_COLS + localCol) * displayIcon,
      top: (sheetRow * SHEET_ROWS + localRow) * displayIcon,
    };
  }, [displayIcon]);

  const selectedRect = useMemo(() => iconRect(selectedIconId), [selectedIconId, iconRect]);
  const hoveredRect = useMemo(() => iconRect(hoveredIcon), [hoveredIcon, iconRect]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const width = SHEET_GRID_COLS * SHEET_COLS * displayIcon;
    const height = Math.ceil(ICON_SHEETS / SHEET_GRID_COLS) * SHEET_ROWS * displayIcon;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    for (let sheet = 0; sheet < ICON_SHEETS; sheet++) {
      const img = new Image();
      img.src = `/api/textures/icons/sheet/${sheet}?v=${iconRevision}`;
      img.onload = () => {
        const sheetCol = sheet % SHEET_GRID_COLS;
        const sheetRow = Math.floor(sheet / SHEET_GRID_COLS);
        for (let row = 0; row < SHEET_ROWS; row++) {
          for (let col = 0; col < SHEET_COLS; col++) {
            const dx = (sheetCol * SHEET_COLS + col) * displayIcon;
            const dy = (sheetRow * SHEET_ROWS + row) * displayIcon;
            ctx.drawImage(
              img,
              col * ICON_SOURCE_SIZE,
              row * ICON_SOURCE_SIZE,
              ICON_SOURCE_SIZE,
              ICON_SOURCE_SIZE,
              dx,
              dy,
              displayIcon,
              displayIcon,
            );
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(dx, dy, displayIcon, displayIcon);
          }
        }
      };
    }
  }, [iconRevision, displayIcon]);

  const iconFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / displayIcon);
    const row = Math.floor((e.clientY - rect.top) / displayIcon);
    if (col < 0 || row < 0 || col >= SHEET_GRID_COLS * SHEET_COLS) return -1;
    const sheetCol = Math.floor(col / SHEET_COLS);
    const sheetRow = Math.floor(row / SHEET_ROWS);
    const sheet = sheetRow * SHEET_GRID_COLS + sheetCol;

    if (sheet >= ICON_SHEETS) return -1;
    const localCol = col % SHEET_COLS;
    const localRow = row % SHEET_ROWS;
    return sheet * ICONS_PER_SHEET + localRow * SHEET_COLS + localCol;
  }, [displayIcon]);

  return (
    <dialog ref={modal} className="atlas-picker-overlay" aria-label={t.iconPicker.title}
      onClick={onClose} onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="atlas-picker-modal icon-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="atlas-picker-header">
          <span>{t.iconPicker.title}</span>
          <button autoFocus onClick={onClose} aria-label={t.iconPicker.closeLabel}>{t.iconPicker.close}</button>
        </div>
        <div className="atlas-picker-canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label={t.iconPicker.title}
            style={{ cursor: 'crosshair', display: 'block' }}
            onMouseMove={e => {
              const nextIcon = iconFromEvent(e);
              setHoveredIcon(prev => (prev === nextIcon ? prev : nextIcon));
            }}
            onMouseLeave={() => setHoveredIcon(-1)}
            onClick={e => {
              const id = iconFromEvent(e);
              if (id >= 0) { onSelect(id); onClose(); }
            }}
          />
          {selectedRect && (
            <div
              className="atlas-picker-selected"
              style={{ left: selectedRect.left, top: selectedRect.top, width: displayIcon, height: displayIcon }}
            />
          )}
          {hoveredRect && hoveredIcon !== selectedIconId && (
            <div
              className="atlas-picker-hovered"
              style={{ left: hoveredRect.left, top: hoveredRect.top, width: displayIcon, height: displayIcon }}
            />
          )}
        </div>
        <div className="atlas-picker-footer">
          {t.iconPicker.hint}
        </div>
      </div>
    </dialog>
  );
}
