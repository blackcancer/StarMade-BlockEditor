/**
 * @fileoverview Properties panel — block field editor.
 *
 * All changes go through the draft system (`updateDraft`) and are only
 * persisted when the user clicks "Save to Custom".
 *
 * ## Improvements
 * - **Override vanilla**: vanilla blocks now have an explicit "Override"
 *   button that promotes them to the custom file without requiring a save.
 *   This enables deep modding of vanilla block definitions.
 * - **Conditional sections**: Light Color and Variants are hidden when not
 *   relevant (no lightSource, empty variant lists), keeping the panel compact.
 * - **Conditional Effect Armor**: only shown when at least one armour type
 *   is present in the draft.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useRef, useState } from 'react';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { useSaveBlock, useDeleteBlock } from '../../hooks/useApi.js';
import { IconPicker } from '../editor/IconPicker.js';
import { displayBlockName } from './blockDisplay.js';
import { BlockIdSelect, Field, VariantSelector } from './propertyControls.js';
import { ExtraPropertiesEditor } from './advancedProperties.js';
import {
  BLOCK_STYLES,
  EFFECT_ARMOR_TYPES,
  LIGHT_PRESETS,
  getIndSidesOptions,
  getSlabOptions,
  getBlockStyleName,
} from './propertyOptions.js';
import { useT } from '../../i18n/index.js';

/**
 * Properties panel component.
 *
 * @component
 */
export function Properties() {
  const t             = useT();
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
  const [importingIcon, setImportingIcon]   = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);

  if (!draft) {
    return (
      <aside className="properties empty">
        <div className="properties-placeholder">
          {t.properties.empty}
        </div>
      </aside>
    );
  }

  const isVanilla    = !draft.isCustom;
  const blockOptions = blocks.filter(b => b.id !== draft.id).sort((a, b) => a.id - b.id);
  const lightHex     = rgbaToHex(draft.lightSourceColor);
  // c8 ignore next
  const displayName  = displayBlockName(draft) || 'Unnamed block';

  // ── Conditional visibility ──────────────────────────────────────────────
  /** Show Light Color section only when the block is a light source. */
  const showLightColor = draft.lightSource === true;

  /** Show Variants section only when there is at least one variant ID. */
  const hasVariants = draft.slabIds.length > 0 || draft.styleIds.length > 0;

  /** Show Effect Armor only when at least one type has a non-zero value. */
  const hasEffectArmor =
    draft.effectArmor &&
    EFFECT_ARMOR_TYPES.some(type => (draft.effectArmor?.[type] ?? 0) !== 0);

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Generic text/number field change handler. */
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
      updateDraft({ icon: draft.icon }); // force img refresh
    } catch (e) {
      alert(t.properties.errorImportIcon(e));
    } finally {
      setImportingIcon(false);
      /* c8 ignore next 2 */
      if (iconFileRef.current) iconFileRef.current.value = '';
    }
  };

  // ── Flag rows ─────────────────────────────────────────────────────────────

  /** Rendering / texture flags — always shown in the Rendering section. */
  const renderingFlags: [keyof BlockDef, keyof typeof t.flag][] = [
    ['sideTexturesPointToOrientation', 'sideTexturesPointToOrientation'],
    ['hasActivationTexture',           'hasActivationTexture'],
    ['extendedTexture4x4',             'extendedTexture4x4'],
    ['onlyDrawnInBuildMode',           'onlyDrawnInBuildMode'],
  ];

  /** General gameplay flags — shown in the Flags section. */
  const generalFlags: [keyof BlockDef, keyof typeof t.flag][] = [
    ['isPlacable',     'isPlacable'],
    ['inShop',         'inShop'],
    ['hasOrientation', 'hasOrientation'],
    ['canActivate',    'canActivate'],
    ['isDeprecated',   'isDeprecated'],
    ['lightSource',    'lightSource'],
    ['transparency',   'transparency'],
    ['door',           'door'],
    ['logicBlock',     'logicBlock'],
    ['animated',       'animated'],
  ];

  return (
    <aside className="properties">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="properties-header">
        <div className="properties-title">
          {displayName}
          {/* c8 ignore next */}
          {draft.isCustom    && <span className="badge badge-custom">{t.properties.badgeCustom}</span>}
          {/* c8 ignore next */}
          {draft.isDeprecated && <span className="badge badge-deprecated">{t.properties.badgeDeprecated}</span>}
        </div>
        <div className="properties-id">
          {draft.isCustom ? t.properties.subtitleCustom : t.properties.subtitleVanilla}
        </div>
      </div>

      {/* Vanilla notice */}
      {isVanilla && (
        <div className="properties-notice">
          {t.properties.vanillaNotice}
        </div>
      )}

      {/* ── Fields ─────────────────────────────────────────────────────── */}
      <div className="properties-body">

        {/* Identity */}
        <section>
          <h4>{t.section.identity}</h4>
          <Field label={t.field.name.label} tooltip={t.field.name.tooltip}>
            <input value={draft.name} onChange={e => onChange('name', e.target.value)} />
          </Field>
          <Field label={t.field.icon.label} tooltip={t.field.icon.tooltip}>
            <div className="icon-field">
              <button type="button" className="icon-preview" onClick={() => setIconPickerOpen(true)} title={t.properties.pickIconTooltip}>
                <img src={`/api/textures/icon/${draft.icon}`} alt="" />
              </button>
              <input type="number" min={0} value={draft.icon} onChange={e => onChange('icon', +e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setIconPickerOpen(true)}>
                {t.properties.pickIcon}
              </button>
              <button type="button" className="btn-secondary" disabled={importingIcon} onClick={() => iconFileRef.current?.click()}>
                {importingIcon ? t.properties.importingIcon : t.properties.importIcon}
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
          <Field label={t.field.description.label} tooltip={t.field.description.tooltip}>
            <textarea value={draft.description} rows={3} onChange={e => onChange('description', e.target.value)} />
          </Field>
        </section>

        {/* Stats */}
        <section>
          <h4>{t.section.stats}</h4>
          <Field label={t.field.hp.label}    tooltip={t.field.hp.tooltip}>
            <input type="number" value={draft.hp}     min={0}           onChange={e => onChange('hp',     +e.target.value)} />
          </Field>
          <Field label={t.field.mass.label}  tooltip={t.field.mass.tooltip}>
            <input type="number" value={draft.mass}   step={0.01} min={0} onChange={e => onChange('mass',   +e.target.value)} />
          </Field>
          <Field label={t.field.volume.label} tooltip={t.field.volume.tooltip}>
            <input type="number" value={draft.volume} step={0.01} min={0} onChange={e => onChange('volume', +e.target.value)} />
          </Field>
          <Field label={t.field.price.label} tooltip={t.field.price.tooltip}>
            <input type="number" value={draft.price}  min={0}           onChange={e => onChange('price',  +e.target.value)} />
          </Field>
          <Field label={t.field.armor.label} tooltip={t.field.armor.tooltip}>
            <input type="number" value={draft.armor}  step={0.01} min={0} max={1} onChange={e => onChange('armor', +e.target.value)} />
          </Field>
          {/* Effect Armor — only shown when at least one value is non-zero */}
          {hasEffectArmor && (
            <Field label={t.field.effectArmor.label} tooltip={t.field.effectArmor.tooltip}>
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
                        effectArmor: { ...(draft.effectArmor ?? {}), [type]: +e.target.value },
                      })}
                    />
                  </label>
                ))}
              </div>
            </Field>
          )}
          {/* Always show Effect Armor when all zeros so user can set values */}
          {!hasEffectArmor && (
            <Field label={t.field.effectArmor.label} tooltip={t.field.effectArmor.tooltip}>
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
                        effectArmor: { ...(draft.effectArmor ?? {}), [type]: +e.target.value },
                      })}
                    />
                  </label>
                ))}
              </div>
            </Field>
          )}
        </section>

        {/* Shape */}
        <section>
          <h4>{t.section.shape}</h4>
          <Field label={t.field.blockStyle.label} tooltip={t.field.blockStyle.tooltip}>
            <select value={draft.blockStyle} onChange={e => onChange('blockStyle', +e.target.value)}>
              {BLOCK_STYLES.map(s => (
                <option key={s} value={s}>{getBlockStyleName(s, t)}</option>
              ))}
            </select>
          </Field>
          <Field label={t.field.slab.label} tooltip={t.field.slab.tooltip}>
            <select value={draft.slab ?? 0} onChange={e => onChange('slab', +e.target.value)}>
              {getSlabOptions(t).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t.field.individualSides.label} tooltip={t.field.individualSides.tooltip}>
            <select value={draft.individualSides} onChange={e => onChange('individualSides', +e.target.value)}>
              {getIndSidesOptions(t).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t.field.computerRef.label} tooltip={t.field.computerRef.tooltip}>
            <BlockIdSelect blocks={blocks} value={draft.computerReference} onChange={id => onChange('computerReference', id)} allowNone />
          </Field>
        </section>

        {/* Rendering / Texture */}
        <section>
          <h4>{t.section.rendering}</h4>
          <div className="flags-grid">
            {renderingFlags.map(([field, labelKey]) => {
              const entry   = t.flag[labelKey];
              const label   = entry.label;
              const tooltip = entry.tooltip;
              return (
                <label key={field as string} className="flag-toggle" title={tooltip}>
                  <input
                    type="checkbox"
                    checked={draft[field] as boolean}
                    onChange={e => onChange(field as string, e.target.checked)}
                  />
                  {label} <span className="field-help" aria-label={tooltip}>ⓘ</span>
                </label>
              );
            })}
          </div>
          <Field label={t.field.lodShapeFromFar.label} tooltip={t.field.lodShapeFromFar.tooltip}>
            <input type="number" min={0} value={draft.lodShapeFromFar} onChange={e => onChange('lodShapeFromFar', +e.target.value)} />
          </Field>
        </section>

        {/* Additional BlockConfig properties */}
        <section>
          <h4>{t.section.extra}</h4>
          <ExtraPropertiesEditor
            value={draft.extraProperties ?? {}}
            blocks={blocks}
            onChange={extraProperties => updateDraft({ extraProperties })}
          />
        </section>

        {/* Flags */}
        <section>
          <h4>{t.section.flags}</h4>
          <div className="flags-grid">
            {generalFlags.map(([field, labelKey]) => {
              const entry   = t.flag[labelKey];
              const label   = entry.label;
              const tooltip = entry.tooltip;
              return (
                <label key={field as string} className="flag-toggle" title={tooltip}>
                  <input
                    type="checkbox"
                    checked={draft[field] as boolean}
                    onChange={e => onChange(field as string, e.target.checked)}
                  />
                  {label} <span className="field-help" aria-label={tooltip}>ⓘ</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Light Color — only when lightSource is enabled */}
        {showLightColor && (
          <section>
            <h4>{t.section.lightColor}</h4>
            <Field label={t.field.lightColor.label} tooltip={t.field.lightColor.tooltip}>
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
                  title={t.field.emissiveIntensity}
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
            <Field label={t.field.lightRGBI.label} tooltip={t.field.lightRGBI.tooltip}>
              <div className="light-color-row">
                {draft.lightSourceColor.map((v, i) => (
                  <input
                    key={i}
                    type="number"
                    step={0.01}
                    min={0}
                    max={i === 3 ? 2 : 1}
                    value={v}
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

        {/* Variants — only when at least one variant list is non-empty */}
        {hasVariants && (
          <section>
            <h4>{t.section.variants}</h4>
            {draft.slabIds.length > 0 && (
              <Field label={t.field.slabIds.label} tooltip={t.field.slabIds.tooltip}>
                <VariantSelector ids={draft.slabIds} options={blockOptions} onChange={ids => updateDraft({ slabIds: ids })} />
              </Field>
            )}
            {draft.styleIds.length > 0 && (
              <Field label={t.field.styleIds.label} tooltip={t.field.styleIds.tooltip}>
                <VariantSelector ids={draft.styleIds} options={blockOptions} onChange={ids => updateDraft({ styleIds: ids })} />
              </Field>
            )}
          </section>
        )}

      </div>

      {/* Error */}
      {error && <div className="properties-error">{error}</div>}

      {/* ── Footer actions ──────────────────────────────────────────────── */}
      <div className="properties-footer">
        {/* Override vanilla — promote a vanilla block to the custom file for deep modding */}
        {isVanilla && (
          <button
            className="btn-secondary btn-override"
            title={t.properties.overrideVanillaTooltip}
            onClick={save}
          >
            {t.properties.overrideVanilla}
          </button>
        )}

        {draft.isCustom && (
          <button
            className="btn-delete"
            title={t.properties.deleteTooltip(draft.name)}
            onClick={() => {
              if (window.confirm(t.properties.deleteConfirm(draft.name))) deleteBlock(draft);
            }}
          >
            {t.properties.delete}
          </button>
        )}
        <button
          className="btn-revert"
          disabled={!isDirty}
          onClick={() => selectBlock(selectedBlock)}
        >
          {t.properties.revert}
        </button>
        <button
          className="btn-save"
          disabled={!isDirty}
          onClick={save}
        >
          {t.properties.save}
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

/**
 * Convert an RGBA float array to a CSS hex colour string.
 *
 * @param {number[]} rgba RGBA float array from `lightSourceColor`.
 * @returns {string} CSS hex string (e.g. `"#60b8ff"`).
 */
function rgbaToHex(rgba: number[]): string {
  const [r = 1, g = 1, b = 1] = rgba;
  return `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Convert a CSS hex colour string back to a [R, G, B, alpha] float array.
 *
 * @param {string} hex  CSS hex colour string with or without leading `#`.
 * @param {number} [alpha=1] Alpha/intensity value to use as the 4th channel.
 * @returns {number[]} [R, G, B, alpha] normalised to [0, 1] (alpha may exceed 1).
 */
function hexToRgba(hex: string, alpha = 1): number[] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b, alpha];
}
