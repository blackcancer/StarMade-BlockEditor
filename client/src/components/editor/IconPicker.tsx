/**
 * @fileoverview Build icon picker modal.
 *
 * StarMade build icons are stored in 1024x1024 sheets named
 * build-icons-XX-16x16-gui-.png. The engine maps iconId / 256 to the sheet
 * and iconId % 256 to a 16x16 multisprite slot (64x64 px in the PNG).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ICON_SHEETS = 6;
const SHEET_COLS = 16;
const SHEET_ROWS = 16;
const ICONS_PER_SHEET = SHEET_COLS * SHEET_ROWS;
const SHEET_GRID_COLS = 3;
const ICON_SOURCE_SIZE = 64;
const DISPLAY_ICON = 36;

interface IconPickerProps {
  selectedIconId: number;
  onSelect: (iconId: number) => void;
  onClose: () => void;
}

export function IconPicker({ selectedIconId, onSelect, onClose }: IconPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIcon, setHoveredIcon] = useState(-1);

  const iconRect = useCallback((iconId: number) => {
    if (iconId < 0) return null;
    const sheet = Math.floor(iconId / ICONS_PER_SHEET);
    if (sheet < 0 || sheet >= ICON_SHEETS) return null;
    const sheetCol = sheet % SHEET_GRID_COLS;
    const sheetRow = Math.floor(sheet / SHEET_GRID_COLS);
    const local = iconId % ICONS_PER_SHEET;
    const localCol = local % SHEET_COLS;
    const localRow = Math.floor(local / SHEET_COLS);
    return {
      left: (sheetCol * SHEET_COLS + localCol) * DISPLAY_ICON,
      top: (sheetRow * SHEET_ROWS + localRow) * DISPLAY_ICON,
    };
  }, []);

  const selectedRect = useMemo(() => iconRect(selectedIconId), [selectedIconId, iconRect]);
  const hoveredRect = useMemo(() => iconRect(hoveredIcon), [hoveredIcon, iconRect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    /* c8 ignore next 2 */
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    /* c8 ignore next 2 */
    if (!ctx) return;

    const width = SHEET_GRID_COLS * SHEET_COLS * DISPLAY_ICON;
    const height = Math.ceil(ICON_SHEETS / SHEET_GRID_COLS) * SHEET_ROWS * DISPLAY_ICON;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    for (let sheet = 0; sheet < ICON_SHEETS; sheet++) {
      const img = new Image();
      img.src = `/api/textures/icons/sheet/${sheet}`;
      img.onload = () => {
        const sheetCol = sheet % SHEET_GRID_COLS;
        const sheetRow = Math.floor(sheet / SHEET_GRID_COLS);
        for (let row = 0; row < SHEET_ROWS; row++) {
          for (let col = 0; col < SHEET_COLS; col++) {
            const dx = (sheetCol * SHEET_COLS + col) * DISPLAY_ICON;
            const dy = (sheetRow * SHEET_ROWS + row) * DISPLAY_ICON;
            ctx.drawImage(
              img,
              col * ICON_SOURCE_SIZE,
              row * ICON_SOURCE_SIZE,
              ICON_SOURCE_SIZE,
              ICON_SOURCE_SIZE,
              dx,
              dy,
              DISPLAY_ICON,
              DISPLAY_ICON,
            );
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(dx, dy, DISPLAY_ICON, DISPLAY_ICON);
          }
        }
      };
    }
  }, []);

  const iconFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / DISPLAY_ICON);
    const row = Math.floor((e.clientY - rect.top) / DISPLAY_ICON);
    if (col < 0 || row < 0 || col >= SHEET_GRID_COLS * SHEET_COLS) return -1;
    const sheetCol = Math.floor(col / SHEET_COLS);
    const sheetRow = Math.floor(row / SHEET_ROWS);
    const sheet = sheetRow * SHEET_GRID_COLS + sheetCol;
    /* c8 ignore next 2 */
    if (sheet < 0 || sheet >= ICON_SHEETS) return -1;
    const localCol = col % SHEET_COLS;
    const localRow = row % SHEET_ROWS;
    return sheet * ICONS_PER_SHEET + localRow * SHEET_COLS + localCol;
  }, []);

  useEffect(() => {
    /* c8 ignore next */
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="atlas-picker-overlay" onClick={onClose}>
      <div className="atlas-picker-modal icon-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="atlas-picker-header">
          <span>Build Icons</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="atlas-picker-canvas-wrap">
          <canvas
            ref={canvasRef}
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
              style={{ left: selectedRect.left, top: selectedRect.top, width: DISPLAY_ICON, height: DISPLAY_ICON }}
            />
          )}
          {hoveredRect && hoveredIcon !== selectedIconId && (
            <div
              className="atlas-picker-hovered"
              style={{ left: hoveredRect.left, top: hoveredRect.top, width: DISPLAY_ICON, height: DISPLAY_ICON }}
            />
          )}
        </div>
        <div className="atlas-picker-footer">
          Click an icon to select · Escape to close
        </div>
      </div>
    </div>
  );
}
