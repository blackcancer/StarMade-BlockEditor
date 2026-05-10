/**
 * @fileoverview Block list sidebar component.
 *
 * Displays all loaded blocks with search, category filter, and
 * custom/vanilla/deprecated toggles.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { blockStyleName } from '../../3d/geometries/index.js';

// ── Style badge ────────────────────────────────────────────────────────────

/**
 * Badge indicating block origin and state.
 *
 * @component
 */
function BlockBadge({ block }: { block: BlockDef }) {
  if (block.isDeprecated) return <span className="badge badge-deprecated">⚠ Deprecated</span>;
  if (block.isCustom)     return <span className="badge badge-custom">★ Custom</span>;
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
  return (
    <div
      className={`block-card ${selected ? 'selected' : ''} ${block.isCustom ? 'custom' : ''}`}
      onClick={() => onSelect(block)}
      title={blockStyleName(block.blockStyle)}
    >
      <div className="block-card-icon">
        <img
          src={`/api/textures/icon/${block.icon}`}
          alt=""
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
      <div className="block-card-body">
        <div className="block-card-name">{block.name}</div>
        <div className="block-card-meta">
          {blockStyleName(block.blockStyle)}
          <BlockBadge block={block} />
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

/**
 * Block list sidebar with search and filter controls.
 *
 * @component
 */
export function Sidebar() {
  const blocks       = useBlockStore(s => s.blocks);
  const selectedBlock = useBlockStore(s => s.selectedBlock);
  const selectBlock   = useBlockStore(s => s.selectBlock);
  const filter       = useBlockStore(s => s.filter);
  const setFilter    = useBlockStore(s => s.setFilter);
  const loading      = useBlockStore(s => s.loading);
  const error        = useBlockStore(s => s.error);

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
          placeholder="🔍 Search block…"
          value={filter.search}
          onChange={e => setFilter({ search: e.target.value })}
        />
      </div>

      {/* Filters */}
      <div className="sidebar-filters">
        <label>
          <input type="checkbox" checked={filter.showVanilla}    onChange={e => setFilter({ showVanilla: e.target.checked })} />
          Vanilla ({vanillaCount})
        </label>
        <label>
          <input type="checkbox" checked={filter.showCustom}     onChange={e => setFilter({ showCustom: e.target.checked })} />
          Custom ({customCount})
        </label>
        <label>
          <input type="checkbox" checked={filter.showDeprecated} onChange={e => setFilter({ showDeprecated: e.target.checked })} />
          Deprecated
        </label>
      </div>

      {/* Status */}
      {loading && <div className="sidebar-status">Loading blocks…</div>}
      {error   && <div className="sidebar-status error">{error}</div>}

      {/* List */}
      <div className="sidebar-list">
        {visible.map(block => (
          <BlockCard
            key={block.id}
            block={block}
            selected={selectedBlock?.id === block.id}
            onSelect={selectBlock}
          />
        ))}
        {!loading && visible.length === 0 && (
          <div className="sidebar-empty">No blocks match your search.</div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        Vanilla: {vanillaCount} · Custom: {customCount}
      </div>
    </aside>
  );
}
