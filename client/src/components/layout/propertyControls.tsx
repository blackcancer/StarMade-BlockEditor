import type React from 'react';
import type { BlockDef } from '../../store/blockStore.js';
import { displayBlockName } from './blockDisplay.js';

export function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" title={tooltip}>
        {label}
        {tooltip && <span className="field-help" aria-label={tooltip}>ⓘ</span>}
      </label>
      <div className="field-input">{children}</div>
    </div>
  );
}

export function VariantSelector({ ids, options, onChange }: { ids: number[]; options: BlockDef[]; onChange: (ids: number[]) => void }) {
  const selected = new Set(ids);
  const addId = (id: number) => {
    if (!id || selected.has(id)) return;
    onChange([...ids, id]);
  };

  return (
    <div className="variant-selector">
      <select value="" onChange={e => addId(+e.target.value)}>
        <option value="">+ Add variant…</option>
        {options.filter(b => !selected.has(b.id)).map(block => (
          <option key={block.id} value={block.id}>{displayBlockName(block)}</option>
        ))}
      </select>
      <div className="variant-chips">
        {ids.length === 0 && <span className="variant-empty">No variants</span>}
        {ids.map(id => {
          const block = options.find(b => b.id === id);
          return (
            <button
              key={id}
              type="button"
              className="variant-chip"
              title="Remove variant"
              onClick={() => onChange(ids.filter(v => v !== id))}
            >
              {block ? displayBlockName(block) : 'Unknown block'} ×
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BlockTypeSelect({ blocks, value, onChange }: { blocks: BlockDef[]; value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">None</option>
      {blocks.map(block => (
        <option key={block.id} value={block.xmlTypeName}>{displayBlockName(block)}</option>
      ))}
    </select>
  );
}

export function BlockIdSelect({ blocks, value, onChange, allowNone = false }: { blocks: BlockDef[]; value: number; onChange: (value: number) => void; allowNone?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(+e.target.value)}>
      {allowNone && <option value={0}>None</option>}
      {blocks.map(block => (
        <option key={block.id} value={block.id}>{displayBlockName(block)}</option>
      ))}
    </select>
  );
}
