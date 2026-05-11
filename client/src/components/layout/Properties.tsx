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

import React, { useRef, useState } from 'react';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { useSaveBlock, useDeleteBlock } from '../../hooks/useApi.js';
import { blockStyleName } from '../../3d/geometries/index.js';
import { IconPicker } from '../editor/IconPicker.js';
import { displayBlockName } from './blockDisplay.js';
import { BlockIdSelect, Field, VariantSelector } from './propertyControls.js';
import { ExtraPropertiesEditor } from './advancedProperties.js';
import {
  BLOCK_STYLES,
  EFFECT_ARMOR_TYPES,
  IND_SIDES_OPTIONS,
  LIGHT_PRESETS,
  SLAB_OPTIONS,
} from './propertyOptions.js';

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
  const blocks        = useBlockStore(s => s.blocks);
  const { save }      = useSaveBlock();
  const { deleteBlock } = useDeleteBlock();
  const error         = useBlockStore(s => s.error);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [importingIcon, setImportingIcon] = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);

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
  const blockOptions = blocks.filter(b => b.id !== draft.id).sort((a, b) => a.id - b.id);
  const lightHex = rgbaToHex(draft.lightSourceColor);

  /** Text/number field change handler. */
  const onChange = (field: string, value: string | number | boolean) => {
    updateDraft({ [field]: value } as Record<string, unknown>);
  };

  const importIcon = async (file: File | null) => {
    if (!file) return;
    setImportingIcon(true);
    try {
      const res = await fetch(`/api/textures/icon/${draft.icon}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      // Force img refresh while keeping the same icon id.
      updateDraft({ icon: draft.icon });
    } catch (e) {
      alert(`Icon import failed: ${e}`);
    } finally {
      setImportingIcon(false);
      /* c8 ignore next 2 */
      if (iconFileRef.current) iconFileRef.current.value = '';
    }
  };

  return (
    <aside className="properties">
      {/* Header */}
      <div className="properties-header">
        <div className="properties-title">
          {/* c8 ignore next */}
          {displayBlockName(draft) || 'Unnamed block'}
          {draft.isCustom   && <span className="badge badge-custom">Custom</span>}
          {draft.isDeprecated && <span className="badge badge-deprecated">Deprecated</span>}
        </div>
        <div className="properties-id">{draft.isCustom ? 'Custom block' : 'Vanilla block'}</div>
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
          <Field label="Name" tooltip="Display name shown by StarMade in inventories, shop/build UI and block lists.">
            <input value={draft.name} onChange={e => onChange('name', e.target.value)} />
          </Field>
          <Field label="Build icon" tooltip="Inventory/build-menu icon. StarMade stores these in build-icons sheets; this picker writes the correct sheet slot for custom icons.">
            <div className="icon-field">
              <button type="button" className="icon-preview" onClick={() => setIconPickerOpen(true)} title="Pick build icon">
                <img src={`/api/textures/icon/${draft.icon}`} alt="" />
              </button>
              <input type="number" min={0} value={draft.icon} onChange={e => onChange('icon', +e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setIconPickerOpen(true)}>Pick…</button>
              <button type="button" className="btn-secondary" disabled={importingIcon} onClick={() => iconFileRef.current?.click()}>
                {importingIcon ? 'Importing…' : 'Import…'}
              </button>
              <input
                ref={iconFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={e => importIcon(e.target.files?.[0] ?? null)}
              />
            </div>
          </Field>
          <Field label="Description" tooltip="Description text shown to players in StarMade UI/tooltips.">
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
          <Field label="HP" tooltip="Hitpoints used by damage/destruction code. Higher values make each placed block harder to destroy.">
            <input type="number" value={draft.hp} min={0} onChange={e => onChange('hp', +e.target.value)} />
          </Field>
          <Field label="Mass" tooltip="Mass contribution of one block. Used by ship/station mass and therefore affects movement and handling.">
            <input type="number" value={draft.mass} step={0.01} min={0} onChange={e => onChange('mass', +e.target.value)} />
          </Field>
          <Field label="Volume" tooltip="Volume value used by balancing/stat systems for this block type.">
            <input type="number" value={draft.volume} step={0.01} min={0} onChange={e => onChange('volume', +e.target.value)} />
          </Field>
          <Field label="Price" tooltip="Base shop/economy price used when the block is available for trade.">
            <input type="number" value={draft.price} min={0} onChange={e => onChange('price', +e.target.value)} />
          </Field>
          <Field label="Armor value" tooltip="General armor/resistance factor used by StarMade damage calculations.">
            <input type="number" value={draft.armor} step={0.01} min={0} max={1} onChange={e => onChange('armor', +e.target.value)} />
          </Field>
          <Field label="Effect Armor" tooltip="Per-damage-type armor modifiers. Source exposes Heat, Kinetic and EM resistances through EffectArmor.">
            <div className="effect-armor-grid">
              {EFFECT_ARMOR_TYPES.map(type => (
                <label key={type}>
                  <span>{type}</span>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={draft.effectArmor?.[type] ?? 0}
                    onChange={e => updateDraft({
                      effectArmor: {
                        ...(draft.effectArmor ?? {}),
                        [type]: +e.target.value,
                      },
                    })}
                  />
                </label>
              ))}
            </div>
          </Field>
        </section>

        {/* Shape */}
        <section>
          <h4>Shape</h4>
          <Field label="Block Style" tooltip="Mesh shape selected by BlockStyle: cube, wedge, corner, cross, tetra, penta, etc.">
            <select value={draft.blockStyle} onChange={e => onChange('blockStyle', +e.target.value)}>
              {BLOCK_STYLES.map(s => (
                <option key={s} value={s}>{blockStyleName(s)}</option>
              ))}
            </select>
          </Field>
          <Field label="Slab geometry" tooltip="Vertical slab thickness used by the engine: full, 3/4, 1/2 or 1/4 block.">
            <select value={draft.slab ?? 0} onChange={e => onChange('slab', +e.target.value)}>
              {SLAB_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Texture face mode" tooltip="How texture IDs are interpreted: one texture for all faces, grouped faces, or six independent face textures.">
            <select value={draft.individualSides} onChange={e => onChange('individualSides', +e.target.value)}>
              {IND_SIDES_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Computer reference" tooltip="Optional linked controller/computer block used by system blocks that reference a control block.">
            <BlockIdSelect blocks={blocks} value={draft.computerReference} onChange={id => onChange('computerReference', id)} allowNone />
          </Field>
        </section>

        {/* Rendering / texture source flags not previously exposed */}
        <section>
          <h4>Rendering / Texture</h4>
          <div className="flags-grid">
            {([
              ['sideTexturesPointToOrientation', 'Textures follow orientation', 'Rotates side texture lookup with block orientation. Used by oriented/rail-like blocks so faces keep the expected texture after placement rotation.'],
              ['hasActivationTexture', 'Activation texture', 'Enables active/inactive texture state. In source, inactive state uses the tile immediately to the right of the base texture.'],
              ['extendedTexture4x4', 'Extended 4×4 texture', 'Uses an extended 4×4 texture footprint instead of a single tile for blocks requiring larger texture areas.'],
              ['onlyDrawnInBuildMode', 'Build-mode only', 'Only rendered in build/edit contexts; used for helper/preview-only blocks that should not render normally.'],
            ] as [keyof typeof draft, string, string][]).map(([field, label, tooltip]) => (
              <label key={field} className="flag-toggle" title={tooltip}>
                <input
                  type="checkbox"
                  checked={draft[field] as boolean}
                  onChange={e => onChange(field, e.target.checked)}
                />
                {label} <span className="field-help" aria-label={tooltip}>ⓘ</span>
              </label>
            ))}
          </div>
          <Field label="Far-distance model" tooltip="LOD shape used at distance. StarMade switches to this low-detail representation when rendering far-away blocks.">
            <input
              type="number"
              min={0}
              value={draft.lodShapeFromFar}
              onChange={e => onChange('lodShapeFromFar', +e.target.value)}
            />
          </Field>
        </section>

        {/* Additional structured properties */}
        <section>
          <h4>Additional BlockConfig properties</h4>
          <ExtraPropertiesEditor
            value={draft.extraProperties ?? {}}
            blocks={blocks}
            onChange={extraProperties => updateDraft({ extraProperties })}
          />
        </section>

        {/* Flags */}
        <section>
          <h4>Flags</h4>
          <div className="flags-grid">
            {([
              ['isPlacable',     'Placable',     'Allows players/build systems to place this block in the world.'],
              ['inShop',         'In Shop',      'Makes the block available to shop/economy systems when applicable.'],
              ['hasOrientation', 'Orientation',  'Stores orientation when placed; enables rotated geometry/texture behavior.'],
              ['canActivate',    'Can Activate', 'Gameplay interaction flag: the block can be toggled/used. This alone does not imply a texture change.'],
              ['isDeprecated',   'Deprecated',   'Marks the block as obsolete for game/UI systems while preserving compatibility.'],
              ['lightSource',    'Light Source', 'When active, contributes light using LightSourceColor: RGB color plus W intensity.'],
              ['transparency',   'Transparency', 'Enables transparent/blended rendering for glass-like blocks.'],
              ['door',           'Door',         'Door-specific behavior flag used by door/opening systems.'],
              ['logicBlock',     'Logic Block',  'Participates in the logic network as a logic-capable block.'],
              ['animated',       'Animated',     'Cycles through a 4-tile texture range; source advances animation frames every ~0.5s.'],
            ] as [keyof typeof draft, string, string][]).map(([field, label, tooltip]) => (
              <label key={field} className="flag-toggle" title={tooltip}>
                <input
                  type="checkbox"
                  checked={draft[field] as boolean}
                  onChange={e => onChange(field, e.target.checked)}
                />
                {label} <span className="field-help" aria-label={tooltip}>ⓘ</span>
              </label>
            ))}
          </div>
        </section>

        {/* Light color (when lightSource) */}
        {draft.lightSource && (
          <section>
            <h4>Light Color</h4>
            <Field label="Color" tooltip="RGB color emitted by an active light source. StarMade reads this as direct RGB, not HSL.">
              <div className="color-editor">
                <input
                  type="color"
                  value={lightHex}
                  onChange={e => updateDraft({ lightSourceColor: hexToRgba(e.target.value, draft.lightSourceColor[3] ?? 1) })}
                />
                <input
                  className="hex-input"
                  value={lightHex}
                  maxLength={7}
                  onChange={e => {
                    const hex = e.target.value;
                    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                      updateDraft({ lightSourceColor: hexToRgba(hex, draft.lightSourceColor[3] ?? 1) });
                    }
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={draft.lightSourceColor[3] ?? 1}
                  title="Emissive intensity"
                  onChange={e => updateDraft({ lightSourceColor: [...draft.lightSourceColor.slice(0, 3), +e.target.value] })}
                />
              </div>
              <div className="palette-row">
                {LIGHT_PRESETS.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    className="palette-swatch"
                    title={hex}
                    style={{ background: hex }}
                    onClick={() => updateDraft({ lightSourceColor: hexToRgba(hex, draft.lightSourceColor[3] ?? 1) })}
                  />
                ))}
              </div>
            </Field>
            <Field label="R G B Intensity" tooltip="LightSourceColor values. RGB are color channels; the fourth value is the W intensity multiplier used by engine lighting.">
              <div className="light-color-row">
                {draft.lightSourceColor.map((v, i) => (
                  <input key={i} type="number" step={0.01} min={0} max={i === 3 ? 2 : 1} value={v}
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

        {/* Variants */}
        <section>
          <h4>Variants</h4>
          <Field label="Slab variants" tooltip="Links to this block's slab variants. StarMade uses these associations to navigate related slab forms.">
            <VariantSelector
              ids={draft.slabIds}
              options={blockOptions}
              onChange={ids => updateDraft({ slabIds: ids })}
            />
          </Field>
          <Field label="Style variants" tooltip="Links to alternate style/shape variants associated with this block.">
            <VariantSelector
              ids={draft.styleIds}
              options={blockOptions}
              onChange={ids => updateDraft({ styleIds: ids })}
            />
          </Field>
        </section>

      </div>

      {/* Error */}
      {error && <div className="properties-error">{error}</div>}

      {/* Footer actions */}
      <div className="properties-footer">
        {draft.isCustom && (
          <button
            className="btn-delete"
            title="Remove this block from customBlockConfig/BlockConfigImport.xml"
            onClick={() => {
              if (window.confirm(`Delete custom block ${draft.name}?`)) deleteBlock(draft);
            }}
          >
            🗑 Delete
          </button>
        )}
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

      {iconPickerOpen && (
        <IconPicker
          selectedIconId={draft.icon}
          onSelect={icon => updateDraft({ icon })}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
    </aside>
  );
}

function rgbaToHex(rgba: number[]): string {
  const [r = 1, g = 1, b = 1] = rgba;
  return `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgba(hex: string, alpha = 1): number[] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b, alpha];
}
