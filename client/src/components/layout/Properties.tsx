/**
 * @fileoverview Properties panel — block field editor.
 *
 * Renders all editable fields for the selected block.
 * All changes go through the draft system (updateDraft) and
 * are only persisted when the user clicks Save.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React from 'react';
import { useBlockStore } from '../../store/blockStore.js';
import { useSaveBlock } from '../../hooks/useApi.js';
import { blockStyleName } from '../../3d/geometries/index.js';

/** BlockStyle options for the dropdown. */
const BLOCK_STYLES = [0, 1, 2, 3, 4, 5, 6];

/** individualSides options. */
const IND_SIDES_OPTIONS = [
  { value: 1, label: '1 — All faces same tile' },
  { value: 3, label: '3 — Front/back · Top/bottom · Sides' },
  { value: 6, label: '6 — Each face independent' },
];

/**
 * Properties panel component.
 *
 * @component
 */
export function Properties() {
  const draft         = useBlockStore(s => s.draft);
  const updateDraft   = useBlockStore(s => s.updateDraft);
  const isDirty       = useBlockStore(s => s.isDirty);
  const selectedBlock = useBlockStore(s => s.selectedBlock);
  const selectBlock   = useBlockStore(s => s.selectBlock);
  const { save }      = useSaveBlock();
  const error         = useBlockStore(s => s.error);

  if (!draft) {
    return (
      <aside className="properties empty">
        <div className="properties-placeholder">
          Select a block to edit its properties.
        </div>
      </aside>
    );
  }

  const isVanilla = !draft.isCustom;

  /** Text/number field change handler. */
  const onChange = (field: string, value: string | number | boolean) => {
    updateDraft({ [field]: value } as Record<string, unknown>);
  };

  return (
    <aside className="properties">
      {/* Header */}
      <div className="properties-header">
        <div className="properties-title">
          {draft.name || 'Unnamed block'}
          {draft.isCustom   && <span className="badge badge-custom">Custom</span>}
          {draft.isDeprecated && <span className="badge badge-deprecated">Deprecated</span>}
        </div>
        <div className="properties-id">ID {draft.id}</div>
      </div>

      {isVanilla && (
        <div className="properties-notice">
          ⚠ Vanilla block — changes will be saved to customBlockConfig/BlockConfigImport.xml.
        </div>
      )}

      {/* Fields */}
      <div className="properties-body">

        {/* Identity */}
        <section>
          <h4>Identity</h4>
          <Field label="Name">
            <input value={draft.name} onChange={e => onChange('name', e.target.value)} />
          </Field>
          <Field label="XML Type (read-only)">
            <input value={draft.xmlTypeName} readOnly />
          </Field>
          <Field label="Description">
            <textarea
              value={draft.description}
              rows={3}
              onChange={e => onChange('description', e.target.value)}
            />
          </Field>
        </section>

        {/* Stats */}
        <section>
          <h4>Stats</h4>
          <Field label="HP">
            <input type="number" value={draft.hp} min={0} onChange={e => onChange('hp', +e.target.value)} />
          </Field>
          <Field label="Mass">
            <input type="number" value={draft.mass} step={0.01} min={0} onChange={e => onChange('mass', +e.target.value)} />
          </Field>
          <Field label="Volume">
            <input type="number" value={draft.volume} step={0.01} min={0} onChange={e => onChange('volume', +e.target.value)} />
          </Field>
          <Field label="Price">
            <input type="number" value={draft.price} min={0} onChange={e => onChange('price', +e.target.value)} />
          </Field>
          <Field label="Armor value">
            <input type="number" value={draft.armor} step={0.01} min={0} max={1} onChange={e => onChange('armor', +e.target.value)} />
          </Field>
        </section>

        {/* Shape */}
        <section>
          <h4>Shape</h4>
          <Field label="Block Style">
            <select value={draft.blockStyle} onChange={e => onChange('blockStyle', +e.target.value)}>
              {BLOCK_STYLES.map(s => (
                <option key={s} value={s}>{s} — {blockStyleName(s)}</option>
              ))}
            </select>
          </Field>
          <Field label="Individual Sides">
            <select value={draft.individualSides} onChange={e => onChange('individualSides', +e.target.value)}>
              {IND_SIDES_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Computer Reference ID">
            <input type="number" value={draft.computerReference} min={0}
              onChange={e => onChange('computerReference', +e.target.value)} />
          </Field>
        </section>

        {/* Flags */}
        <section>
          <h4>Flags</h4>
          <div className="flags-grid">
            {([
              ['isPlacable',     'Placable'],
              ['inShop',         'In Shop'],
              ['hasOrientation', 'Orientation'],
              ['canActivate',    'Can Activate'],
              ['isDeprecated',   'Deprecated'],
              ['lightSource',    'Light Source'],
              ['transparency',   'Transparency'],
              ['door',           'Door'],
              ['logicBlock',     'Logic Block'],
              ['animated',       'Animated'],
            ] as [keyof typeof draft, string][]).map(([field, label]) => (
              <label key={field} className="flag-toggle">
                <input
                  type="checkbox"
                  checked={draft[field] as boolean}
                  onChange={e => onChange(field, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {/* Light color (when lightSource) */}
        {draft.lightSource && (
          <section>
            <h4>Light Color</h4>
            <Field label="R G B A">
              <div className="light-color-row">
                {draft.lightSourceColor.map((v, i) => (
                  <input key={i} type="number" step={0.01} min={0} max={1} value={v}
                    onChange={e => {
                      const colors = [...draft.lightSourceColor];
                      colors[i] = +e.target.value;
                      updateDraft({ lightSourceColor: colors });
                    }}
                  />
                ))}
              </div>
            </Field>
          </section>
        )}

        {/* Variant IDs */}
        <section>
          <h4>Variants</h4>
          <Field label="Slab IDs">
            <input value={draft.slabIds.join(', ')}
              onChange={e => updateDraft({ slabIds: e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) })}
            />
          </Field>
          <Field label="Style IDs">
            <input value={draft.styleIds.join(', ')}
              onChange={e => updateDraft({ styleIds: e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) })}
            />
          </Field>
        </section>

      </div>

      {/* Error */}
      {error && <div className="properties-error">{error}</div>}

      {/* Footer actions */}
      <div className="properties-footer">
        <button
          className="btn-revert"
          disabled={!isDirty}
          onClick={() => selectBlock(selectedBlock)}
        >
          ↩ Revert
        </button>
        <button
          className="btn-save"
          disabled={!isDirty}
          onClick={save}
        >
          💾 Save to Custom
        </button>
      </div>
    </aside>
  );
}

/** Generic labeled field wrapper. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="field-input">{children}</div>
    </div>
  );
}
