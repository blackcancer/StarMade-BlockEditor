/**
 * @fileoverview Block list sidebar component.
 *
 * Displays all loaded blocks as a scrollable, searchable, filterable card list.
 *
 * ## Features
 *  - **Search** — filters by block name, XML type name, or numeric ID.
 *  - **Toggles** — independently show/hide vanilla, custom, and deprecated blocks.
 *  - **BlockCard** — shows the build-menu icon (from `/api/textures/icon/:id`),
 *    the human-readable display name, the block style, and a custom/deprecated badge.
 *    Icons that fail to load (missing sheet) are hidden gracefully.
 *  - **Footer** — Vanilla/Custom block counts.
 *  - **Loading/error** — passes loading and error state from the block store.
 *
 * ## Display name logic
 * Block names in BlockConfig.xml often include the XML type prefix:
 *  - `"METAL_MESH -- Metal mesh"` → displayed as `"Metal mesh"`
 *  - `"HULL_COLOR_GREY: Grey Hull"` → displayed as `"Grey Hull"`
 * See `displayBlockName()` and `prettifyTypeName()` (local copies of blockDisplay.ts).
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { displayBlockName } from '../layout/blockDisplay.js';
import { useT } from '../../i18n/index.js';
import { getBlockStyleName } from '../layout/propertyOptions.js';
import { localizeMessage, technicalDetail } from '../../i18n/messages.js';

// ── Style badge ────────────────────────────────────────────────────────────

/**
 * Badge indicating block origin and state.
 *
 * @component
 */
function BlockBadge({ block }: { block: BlockDef }) {
  const t = useT();
  if (block.isDeprecated) return <span className="badge badge-deprecated">⚠ {t.properties.badgeDeprecated}</span>;
  if (block.isCustom)     return <span className="badge badge-custom">★ {t.properties.badgeCustom}</span>;
  return null;
}

// ── Block card ────────────────────────────────────────────────────────────

/**
 * Single block entry in the list.
 *
 * @component
 */
function BlockCard({ block, selected, onSelect }: {
  block: BlockDef;
  selected: boolean;
  onSelect: (b: BlockDef) => void;
}) {
  const t = useT();
  const iconRevision = useBlockStore(s => s.iconRevision);
  return (
    <button type="button" aria-pressed={selected}
      className={`block-card ${selected ? 'selected' : ''} ${block.isCustom ? 'custom' : ''}`}
      onClick={() => onSelect(block)}
      title={getBlockStyleName(block.blockStyle, t)}
    >
      <span className="block-card-icon">
        <img
          src={`/api/textures/icon/${block.icon}?v=${iconRevision}`}
          alt=""
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      </span>
      <span className="block-card-body">
        <span className="block-card-name">{displayBlockName(block)}</span>
        <span className="block-card-meta">
          {getBlockStyleName(block.blockStyle, t)}
          <BlockBadge block={block} />
        </span>
      </span>
    </button>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

/**
 * Searchable block navigation sidebar.
 *
 * The sidebar applies text and source/deprecated filters, renders readable names/icons, and updates the selected block in the global store. Selecting an entry creates the draft that the viewer and properties panel edit.
 *
 * @returns Filter controls and block selection list.
 */

export function Sidebar({ onBlockOpen }: { onBlockOpen?: () => void }) {
  const t          = useT();
  const blocks       = useBlockStore(s => s.blocks);
  const selectedBlock = useBlockStore(s => s.selectedBlock);
  const selectBlock   = useBlockStore(s => s.selectBlock);
  const filter       = useBlockStore(s => s.filter);
  const setFilter    = useBlockStore(s => s.setFilter);
  const loading      = useBlockStore(s => s.loading);
  const error        = useBlockStore(s => s.error);
  const isDirty = useBlockStore(s => s.isDirty);
  const detail = error && technicalDetail(error, t);

  // ── Filtered + sorted block list ────────────────────────────────────────
  const visible = useMemo(() => {
    return blocks
      .filter(b => {
        if (!filter.showDeprecated && b.isDeprecated) return false;
        if (!filter.showCustom    && b.isCustom)      return false;
        if (!filter.showVanilla   && !b.isCustom)     return false;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          return (
            b.name.toLowerCase().includes(q) ||
            b.xmlTypeName.toLowerCase().includes(q) ||
            String(b.id).includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.id - b.id);
  }, [blocks, filter]);

  const customCount  = blocks.filter(b =>  b.isCustom).length;
  const vanillaCount = blocks.filter(b => !b.isCustom).length;

  return (
    <aside className="sidebar">
      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder={t.sidebar.searchPlaceholder}
          value={filter.search}
          onChange={e => setFilter({ search: e.target.value })}
        />
      </div>

      {/* Filters */}
      <div className="sidebar-filters">
        <label>
          <input type="checkbox" checked={filter.showVanilla}    onChange={e => setFilter({ showVanilla: e.target.checked })} />
          {t.sidebar.filterVanilla(vanillaCount)}
        </label>
        <label>
          <input type="checkbox" checked={filter.showCustom}     onChange={e => setFilter({ showCustom: e.target.checked })} />
          {t.sidebar.filterCustom(customCount)}
        </label>
        <label>
          <input type="checkbox" checked={filter.showDeprecated} onChange={e => setFilter({ showDeprecated: e.target.checked })} />
          {t.sidebar.filterDeprecated}
        </label>
      </div>

      {/* Status */}
      {loading && <div className="sidebar-status">{t.sidebar.loading}</div>}
      {error && <div className="sidebar-status error">{localizeMessage(error, t)}
        {detail && <details><summary>{t.errors.technicalDetails}</summary><div>{detail}</div></details>}
      </div>}

      {/* List */}
      <div className="sidebar-list">
        {visible.map(block => (
          <BlockCard
            key={block.id}
            block={block}
            selected={selectedBlock?.id === block.id}
            onSelect={block => {
              if (block.id !== selectedBlock?.id) {
                if (isDirty && !window.confirm(t.sidebar.discardConfirm)) return;
                selectBlock(block);
              }
              onBlockOpen?.();
            }}
          />
        ))}
        {!loading && visible.length === 0 && (
          <div className="sidebar-empty">{t.sidebar.empty}</div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {t.sidebar.footer(vanillaCount, customCount)}
      </div>
    </aside>
  );
}
