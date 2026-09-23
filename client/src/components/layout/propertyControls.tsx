/**
 * @fileoverview Shared property control components for the block editor panel.
 *
 * Provides reusable UI primitives used throughout the Properties panel and
 * the advanced property editors:
 *
 *  - `Field`            — label + optional tooltip wrapper around any input
 *  - `VariantSelector`  — chip-list selector for block ID arrays (slabIds, styleIds)
 *  - `BlockTypeSelect`  — dropdown that maps block XML type names to readable names
 *  - `BlockIdSelect`    — dropdown that maps block numeric IDs to readable names
 *
 * All selects display human-readable names from `displayBlockName`, hiding
 * technical IDs and XML type names from the end user.
 *
 * @module propertyControls
 * @author InitSysRev
 * @version 1.0.0
 */

import type React from 'react';
import { useId, useState } from 'react';
import type { BlockDef } from '../../store/blockStore.js';
import { displayBlockName } from './blockDisplay.js';
import { useT } from '../../i18n/index.js';

// ── Field wrapper ─────────────────────────────────────────────────────────────

/**
 * Labelled field wrapper used throughout the properties panel.
 *
 * Renders a `<label>` with the field name and an optional ⓘ tooltip indicator,
 * then the child input/control in a flex container.
 *
 * @component
 *
 * @param {string} label    Visible label text (e.g. `"Hitpoints"`).
 * @param {string} [tooltip] Optional tooltip text shown on hover and via aria-label.
 * @param {React.ReactNode} children The control(s) to render inside the field.
 *
 * @example
 * <Field label="Hitpoints" tooltip="Block durability value.">
 *   <input type="number" value={draft.hp} onChange={…} />
 * </Field>
 */
export function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  const helpId = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="field">
      <div className="field-label" title={tooltip}>
        {label}
        {/* ⓘ indicator: only shown when a tooltip is provided; screen readers read aria-label */}
        {tooltip && <button type="button" className="field-help-button" aria-label={tooltip} aria-expanded={helpOpen}
          aria-controls={helpId} onClick={() => setHelpOpen(value => !value)}
          onKeyDown={event => { if (event.key === 'Escape') setHelpOpen(false); }}>ⓘ</button>}
      </div>
      {tooltip && <div id={helpId} role="tooltip" className="field-help-content" hidden={!helpOpen}>{tooltip}</div>}
      <div className="field-input">{children}</div>
    </div>
  );
}

// ── VariantSelector ───────────────────────────────────────────────────────────

/**
 * Chip-based selector for a list of block IDs.
 *
 * Used for the `slabIds` and `styleIds` arrays in block definitions.
 * Renders selected blocks as removable chips and provides a dropdown to
 * add additional blocks from the available pool.
 *
 * Duplicate IDs are silently ignored (the same block cannot be added twice).
 * ID 0 (falsy) is treated as "none" and cannot be added.
 *
 * @component
 *
 * @param {number[]} ids         Currently selected block IDs.
 * @param {BlockDef[]} options   Full block pool available for selection.
 * @param {(ids: number[]) => void} onChange Callback with the updated ID array.
 *
 * @example
 * <VariantSelector
 *   ids={draft.slabIds}
 *   options={blocks}
 *   onChange={ids => updateDraft({ slabIds: ids })}
 * />
 */
export function VariantSelector({ ids, options, onChange }: {
  ids: number[];
  options: BlockDef[];
  onChange: (ids: number[]) => void;
}) {
  const t = useT();
  const selected = new Set(ids);

  /**
   * Add a block ID to the selection.
   * No-ops on ID=0 (falsy/none) and on already-selected blocks.
   *
   * @param {number} id Block ID to add.
   */
  const addId = (id: number) => {
    if (!id || selected.has(id)) return;
    onChange([...ids, id]);
  };

  return (
    <div className="variant-selector">
      {/* Add dropdown — only shows blocks not already selected */}
      <select value="" onChange={e => addId(+e.target.value)}>
        <option value="">{t.variant.add}</option>
        {options.filter(b => !selected.has(b.id)).map(block => (
          <option key={block.id} value={block.id}>{displayBlockName(block)}</option>
        ))}
      </select>

      {/* Chip list — each chip can be clicked to remove the block */}
      <div className="variant-chips">
        {ids.length === 0 && <span className="variant-empty">{t.variant.none}</span>}
        {ids.map(id => {
          const block = options.find(b => b.id === id);
          return (
            <button
              key={id}
              type="button"
              className="variant-chip"
              title={t.variant.remove}
              onClick={() => onChange(ids.filter(v => v !== id))}
            >
              {/* Fall back to translated "unknown" label when the ID no longer exists */}
              {block ? displayBlockName(block) : t.variant.unknown} ×
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── BlockTypeSelect ───────────────────────────────────────────────────────────

/**
 * Dropdown that selects a block by its XML type name (`xmlTypeName`).
 *
 * Used for resource recipe entries (Consistence, RecipeBuyResource, etc.)
 * where StarMade stores the raw XML type name rather than a numeric ID.
 * Displays human-readable block names from `displayBlockName` in the UI.
 *
 * @component
 *
 * @param {BlockDef[]} blocks      Full block pool.
 * @param {string}     value       Currently selected XML type name.
 * @param {(value: string) => void} onChange Callback with the new XML type name.
 *
 * @example
 * <BlockTypeSelect
 *   blocks={blocks}
 *   value={item.name}
 *   onChange={name => update(index, { name })}
 * />
 */
export function BlockTypeSelect({ blocks, value, onChange }: {
  blocks: BlockDef[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{t.none}</option>
      {blocks.map(block => (
        <option key={block.id} value={block.xmlTypeName}>
          {displayBlockName(block)}
        </option>
      ))}
    </select>
  );
}

// ── BlockIdSelect ─────────────────────────────────────────────────────────────

/**
 * Dropdown that selects a block by its numeric block ID.
 *
 * Used for fields that store a block reference by numeric ID —
 * e.g. `computerReference`, `ChamberRoot`, `BasicResourceFactory`.
 * Displays human-readable block names from `displayBlockName`.
 *
 * @component
 *
 * @param {BlockDef[]}  blocks    Full block pool.
 * @param {number}      value     Currently selected block ID.
 * @param {(value: number) => void} onChange Callback with the new block ID.
 * @param {boolean}     [allowNone=false] When true, prepends a "None" option (value=0).
 *
 * @example
 * <BlockIdSelect
 *   blocks={blocks}
 *   value={draft.computerReference}
 *   onChange={id => onChange('computerReference', id)}
 *   allowNone
 * />
 */
export function BlockIdSelect({ blocks, value, onChange, allowNone = false }: {
  blocks: BlockDef[];
  value: number;
  onChange: (value: number) => void;
  allowNone?: boolean;
}) {
  const t = useT();
  return (
    <select value={value} onChange={e => onChange(+e.target.value)}>
      {allowNone && <option value={0}>{t.none}</option>}
      {blocks.map(block => (
        <option key={block.id} value={block.id}>
          {displayBlockName(block)}
        </option>
      ))}
    </select>
  );
}
