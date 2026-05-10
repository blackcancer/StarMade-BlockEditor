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

/** BlockStyle options for the dropdown. */
const BLOCK_STYLES = [0, 1, 2, 3, 4, 5, 6];

/** individualSides options. */
const IND_SIDES_OPTIONS = [
  { value: 1, label: '1 — All faces same tile' },
  { value: 3, label: '3 — Front/back · Top/bottom · Sides' },
  { value: 6, label: '6 — Each face independent' },
];

const LIGHT_PRESETS = ['#ffffff', '#60b8ff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#f97316'];

const SLAB_OPTIONS = [
  { value: 0, label: '0 — Full block' },
  { value: 1, label: '1 — 3/4 slab' },
  { value: 2, label: '2 — 1/2 slab' },
  { value: 3, label: '3 — 1/4 slab' },
];

const EFFECT_ARMOR_TYPES = ['Heat', 'Kinetic', 'EM'];

const RESOURCE_TYPE_OPTIONS = [
  { value: 0, label: '0 — Ore' },
  { value: 1, label: '1 — Plant' },
  { value: 2, label: '2 — Basic resource' },
  { value: 3, label: '3 — Cubatom-splittable' },
  { value: 4, label: '4 — Manufactory' },
  { value: 5, label: '5 — Advanced' },
  { value: 6, label: '6 — Capsule' },
];

const FACTORY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Capsule refinery' },
  { value: 2, label: 'Micro assembler' },
  { value: 3, label: 'Component factory' },
  { value: 4, label: 'Block assembler' },
  { value: 5, label: 'Chemical factory' },
];

const EXTRA_PROPERTY_GROUPS = [
  { title: 'Resources / Recipes', keys: ['Consistence', 'CubatomConsistence', 'InRecipe', 'RecipeBuyResource', 'BlockResourceType'] },
  { title: 'Factory / Production', keys: ['ProducedInFactory', 'BasicResourceFactory', 'FactoryBakeTime', 'Factory'] },
  { title: 'Chambers', keys: ['GeneralChamber', 'ChamberCapacity', 'ChamberRoot', 'ChamberParent', 'ChamberUpgradesTo', 'ChamberPermission', 'ChamberAppliesTo', 'ChamberPrerequisites', 'ChamberMutuallyExclusive', 'ChamberChildren', 'ChamberConfigGroups'] },
  { title: 'Controllers', keys: ['ControlledBy', 'Controlling', 'MainCombinationController', 'SupportCombinationController', 'EffectCombinationController'] },
  { title: 'Collision / Physical', keys: ['Physical', 'CollisionDefault', 'CubeCubeCollision', 'UseDetailedCollisionForAstronautMode', 'DetailedCollisionForAstronautMode', 'LodCollisionPhysical', 'Enterable'] },
  { title: 'LOD / Mesh', keys: ['LodShape', 'LodShapeSwitchStyleActive', 'LodActivationAnimationStyle'] },
  { title: 'Logic / Gameplay', keys: ['SensorInput', 'DrawLogicConnection', 'LogicSignaledByRail', 'LogicBlockButton', 'Beacon', 'ResourceInjection', 'ExplosionAbsorbtion'] },
  { title: 'Reactor / Structure', keys: ['StructureHPContribution', 'SourceReference', 'ReactorHp', 'ReactorGeneralIconIndex', 'LowHpSetting', 'OldHitpoints', 'SystemBlock'] },
  { title: 'Inventory / Metadata', keys: ['InventoryGroup', 'FullName', 'WildcardIds'] },
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
      if (iconFileRef.current) iconFileRef.current.value = '';
    }
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
          <Field label="Name" tooltip="Display name shown in inventories, shops and config lists.">
            <input value={draft.name} onChange={e => onChange('name', e.target.value)} />
          </Field>
          <Field label="XML Type (read-only)" tooltip="Internal StarMade block type key from BlockTypes.properties. Kept read-only to avoid breaking ID mapping.">
            <input value={draft.xmlTypeName} readOnly />
          </Field>
          <Field label="Build icon" tooltip="Icon index from data/image-resource/build-icons-[sheet]-16x16-gui-.png. Custom blocks can pick their inventory/build icon here.">
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
          <Field label="Description" tooltip="Text used by StarMade to describe the block to players.">
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
          <Field label="HP" tooltip="Hit points. Higher values make the block more resistant to damage.">
            <input type="number" value={draft.hp} min={0} onChange={e => onChange('hp', +e.target.value)} />
          </Field>
          <Field label="Mass" tooltip="Mass contribution per block. Impacts ship mass, acceleration and handling.">
            <input type="number" value={draft.mass} step={0.01} min={0} onChange={e => onChange('mass', +e.target.value)} />
          </Field>
          <Field label="Volume" tooltip="Block volume used by StarMade stats and balancing systems.">
            <input type="number" value={draft.volume} step={0.01} min={0} onChange={e => onChange('volume', +e.target.value)} />
          </Field>
          <Field label="Price" tooltip="Shop and economy price in credits.">
            <input type="number" value={draft.price} min={0} onChange={e => onChange('price', +e.target.value)} />
          </Field>
          <Field label="Armor value" tooltip="Armor/resistance value used by StarMade damage calculations.">
            <input type="number" value={draft.armor} step={0.01} min={0} max={1} onChange={e => onChange('armor', +e.target.value)} />
          </Field>
          <Field label="Effect Armor" tooltip="EffectArmor resistances from BlockConfig.xml. StarMade currently exposes Heat, Kinetic and EM here.">
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
          <Field label="Block Style" tooltip="Geometric shape: cube, wedge, corner, cross, tetra, penta, etc.">
            <select value={draft.blockStyle} onChange={e => onChange('blockStyle', +e.target.value)}>
              {BLOCK_STYLES.map(s => (
                <option key={s} value={s}>{s} — {blockStyleName(s)}</option>
              ))}
            </select>
          </Field>
          <Field label="Slab geometry" tooltip="Slab height from BlockConfig.xml. StarMade uses 1=3/4, 2=1/2, 3=1/4.">
            <select value={draft.slab ?? 0} onChange={e => onChange('slab', +e.target.value)}>
              {SLAB_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Individual Sides" tooltip="Texture assignment mode: 1 = same tile everywhere, 3 = grouped faces, 6 = one tile per face.">
            <select value={draft.individualSides} onChange={e => onChange('individualSides', +e.target.value)}>
              {IND_SIDES_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Computer Reference ID" tooltip="ID of the controller/computer block linked to this block, when applicable.">
            <input type="number" value={draft.computerReference} min={0}
              onChange={e => onChange('computerReference', +e.target.value)} />
          </Field>
        </section>

        {/* Rendering / texture source flags not previously exposed */}
        <section>
          <h4>Rendering / Texture</h4>
          <div className="flags-grid">
            {([
              ['sideTexturesPointToOrientation', 'Textures follow orientation', 'Uses SideTexturesPointToOrientation from BlockConfig.xml; important for rails and oriented texture layouts.'],
              ['hasActivationTexture', 'Activation texture', 'Uses HasActivationTexture from BlockConfig.xml for blocks with an alternate active state texture.'],
              ['extendedTexture4x4', 'Extended 4×4 texture', 'Uses ExtendedTexture4x4 from BlockConfig.xml for blocks that span a larger atlas area.'],
              ['onlyDrawnInBuildMode', 'Build-mode only', 'Uses OnlyDrawnInBuildMode from BlockConfig.xml.'],
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
          <Field label="LOD shape from far" tooltip="Raw LodShapeFromFar value from BlockConfig.xml.">
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
              ['isPlacable',     'Placable',     'Can be placed by players in build mode.'],
              ['inShop',         'In Shop',      'Can appear in shops/economy systems.'],
              ['hasOrientation', 'Orientation',  'Supports orientation/rotation when placed.'],
              ['canActivate',    'Can Activate', 'Can be toggled or activated by game logic.'],
              ['isDeprecated',   'Deprecated',   'Marks the block as obsolete; normally hidden/avoided.'],
              ['lightSource',    'Light Source', 'Emits light using the configured RGBA color.'],
              ['transparency',   'Transparency', 'Uses alpha transparency for glass/transparent blocks.'],
              ['door',           'Door',         'Flags the block as a door-like block.'],
              ['logicBlock',     'Logic Block',  'Participates in StarMade logic systems.'],
              ['animated',       'Animated',     'Uses animated texture/behavior when supported.'],
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
            <Field label="Color" tooltip="Emissive color emitted by this block and preview light. Pick a color or enter HEX.">
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
            <Field label="R G B Intensity" tooltip="Raw normalized values. RGB are 0–1; intensity may go up to 2 for preview/emissive strength.">
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

        {/* Variant IDs */}
        <section>
          <h4>Variants</h4>
          <Field label="Slab IDs" tooltip="Choose slab variant block IDs associated with this block.">
            <VariantSelector
              ids={draft.slabIds}
              options={blockOptions}
              onChange={ids => updateDraft({ slabIds: ids })}
            />
          </Field>
          <Field label="Style IDs" tooltip="Choose alternate style variant block IDs associated with this block.">
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
              if (window.confirm(`Delete custom block ${draft.name} (${draft.id})?`)) deleteBlock(draft);
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

/** Generic labeled field wrapper. */
function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
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

function VariantSelector({ ids, options, onChange }: { ids: number[]; options: BlockDef[]; onChange: (ids: number[]) => void }) {
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
          <option key={block.id} value={block.id}>{block.id} — {block.name}</option>
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
              {id}{block ? ` — ${block.name}` : ''} ×
            </button>
          );
        })}
      </div>
    </div>
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

function ExtraPropertiesEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const [filter, setFilter] = useState('');
  const grouped = new Set(EXTRA_PROPERTY_GROUPS.flatMap(group => group.keys));
  const otherKeys = Object.keys(value).filter(key => !grouped.has(key)).sort();
  const normalizedFilter = filter.trim().toLowerCase();
  const matchesFilter = (key: string) => {
    if (!normalizedFilter) return true;
    return key.toLowerCase().includes(normalizedFilter)
      || formatPropertyLabel(key).toLowerCase().includes(normalizedFilter)
      || JSON.stringify(value[key] ?? '').toLowerCase().includes(normalizedFilter);
  };
  const groups = [
    ...EXTRA_PROPERTY_GROUPS.map(group => ({ ...group, keys: group.keys.filter(key => key in value && matchesFilter(key)) })).filter(group => group.keys.length > 0),
    ...(otherKeys.filter(matchesFilter).length > 0 ? [{ title: 'Other', keys: otherKeys.filter(matchesFilter) }] : []),
  ];
  const propertyCount = Object.keys(value).length;

  if (propertyCount === 0) {
    return <div className="variant-empty">No additional BlockConfig properties.</div>;
  }

  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="extra-properties-editor">
      <div className="extra-properties-toolbar">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder={`Search ${propertyCount} properties…`}
        />
        {filter && <button type="button" className="btn-secondary" onClick={() => setFilter('')}>Clear</button>}
      </div>
      {groups.length === 0 && <div className="variant-empty">No property matches “{filter}”.</div>}
      {groups.map(group => (
        <details key={group.title} className="extra-property-group" open={normalizedFilter !== '' || group.title !== 'Other'}>
          <summary>
            <span>{group.title}</span>
            <span className="extra-property-count">{group.keys.length}</span>
          </summary>
          <div className="extra-property-fields">
            {group.title === 'Resources / Recipes' ? (
              <ResourceRecipeEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Factory / Production' ? (
              <FactoryProductionEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Chambers' ? (
              <ChambersEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Controllers' ? (
              <ControllersEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.keys.map(key => (
              <Field key={key} label={formatPropertyLabel(key)} tooltip={key}>
                <ExtraValueEditor value={value[key]} onChange={next => updateKey(key, next)} />
              </Field>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

type ResourceEntry = { name: string; count: number };

function ResourceRecipeEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  const inRecipe = Boolean(value.InRecipe);

  return (
    <div className="resource-recipe-editor">
      <div className="resource-summary-card">
        <div>
          <strong>Recipe participation</strong>
          <p>When disabled, recipe inputs remain preserved but are hidden because StarMade will not use them for crafting.</p>
        </div>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={inRecipe}
            onChange={e => updateKey('InRecipe', e.target.checked)}
          />
          In recipe
        </label>
      </div>

      {!inRecipe ? (
        <div className="variant-empty">Recipe fields are inactive because InRecipe is false.</div>
      ) : (
        <>
          <div className="resource-two-col">
            <Field label="Resource type" tooltip="BlockResourceType category used by economy/factory grouping.">
              <select value={Number(value.BlockResourceType ?? 2)} onChange={e => updateKey('BlockResourceType', +e.target.value)}>
                {RESOURCE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Buy recipe resources" tooltip="RecipeBuyResource entries use BlockTypes keys; the dropdown stores the XML type name used by StarMade.">
              <ElementListEditor
                value={normalizeElementList(value.RecipeBuyResource)}
                blocks={blocks}
                onChange={items => updateKey('RecipeBuyResource', serializeElementList(items))}
                addLabel="+ Add buy resource"
              />
            </Field>
          </div>

          <ResourceListEditor
            title="Material requirements"
            help="Consistence resources. Each row stores a count and a BlockTypes key."
            value={normalizeResourceList(value.Consistence)}
            blocks={blocks}
            addLabel="+ Add material"
            onChange={items => updateKey('Consistence', serializeResourceList(items))}
          />

          <details className="resource-subsection">
            <summary>Cubatom consistence <span>specialized</span></summary>
            <ResourceListEditor
              title="Cubatom materials"
              help="Used by cubatom/capsule splitting logic. Usually empty for normal blocks."
              value={normalizeResourceList(value.CubatomConsistence)}
              blocks={blocks}
              addLabel="+ Add cubatom material"
              onChange={items => updateKey('CubatomConsistence', serializeResourceList(items))}
            />
          </details>
        </>
      )}
    </div>
  );
}

function ResourceListEditor({ title, help, value, blocks, addLabel, onChange }: { title: string; help: string; value: ResourceEntry[]; blocks: BlockDef[]; addLabel: string; onChange: (value: ResourceEntry[]) => void }) {
  const update = (index: number, patch: Partial<ResourceEntry>) => {
    onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  return (
    <div className="resource-list-editor">
      <div className="resource-list-header">
        <div>
          <strong>{title}</strong>
          <p>{help}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => onChange([...value, { name: blocks[0]?.xmlTypeName ?? '', count: 1 }])}>{addLabel}</button>
      </div>
      {value.length === 0 ? (
        <div className="variant-empty">No resources.</div>
      ) : value.map((item, index) => (
        <div key={index} className="resource-row">
          <input
            className="resource-count"
            type="number"
            min={0}
            value={item.count}
            onChange={e => update(index, { count: +e.target.value })}
          />
          <BlockTypeSelect
            blocks={blocks}
            value={item.name}
            onChange={name => update(index, { name })}
          />
          <button type="button" className="btn-secondary" title="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
    </div>
  );
}

function ElementListEditor({ value, blocks, onChange, addLabel }: { value: string[]; blocks: BlockDef[]; onChange: (value: string[]) => void; addLabel: string }) {
  return (
    <div className="element-list-editor">
      {value.map((item, index) => (
        <div key={index} className="element-row">
          <BlockTypeSelect blocks={blocks} value={item} onChange={name => onChange(value.map((current, i) => i === index ? name : current))} />
          <button type="button" className="btn-secondary" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, blocks[0]?.xmlTypeName ?? ''])}>{addLabel}</button>
    </div>
  );
}

function normalizeResourceList(raw: unknown): ResourceEntry[] {
  if (!raw || raw === '') return [];
  if (Array.isArray(raw)) return raw.flatMap(normalizeResourceList);
  if (typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const item = obj.Item ?? obj.item;
  if (item !== undefined) return normalizeResourceItems(Array.isArray(item) ? item : [item]);
  if ('#text' in obj || '@_count' in obj) return normalizeResourceItems([obj]);
  return [];
}

function normalizeResourceItems(items: unknown[]): ResourceEntry[] {
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      name: String(item['#text'] ?? ''),
      count: Number(item['@_count'] ?? 1),
    }));
}

function serializeResourceList(items: ResourceEntry[]): Record<string, unknown> | string {
  const clean = items.filter(item => item.name.trim());
  if (clean.length === 0) return '';
  return {
    Item: clean.map(item => ({ '#text': item.name.trim(), '@_count': String(Math.max(0, item.count || 0)) })),
  };
}

function normalizeElementList(raw: unknown): string[] {
  if (!raw || raw === '') return [];
  if (typeof raw === 'string') return [raw].filter(Boolean);
  if (Array.isArray(raw)) return raw.flatMap(normalizeElementList);
  if (typeof raw !== 'object') return [];
  const element = (raw as Record<string, unknown>).Element;
  if (element === undefined) return [];
  return Array.isArray(element) ? element.map(String) : [String(element)];
}

function serializeElementList(items: string[]): Record<string, unknown> | string {
  const clean = items.map(item => item.trim()).filter(Boolean);
  if (clean.length === 0) return '';
  return { Element: clean.length === 1 ? clean[0] : clean };
}

function FactoryProductionEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return (
    <div className="production-editor">
      <Field label="Produced in" tooltip="ProducedInFactory. Stored as FAC_* numeric value in XML.">
        <select value={Number(value.ProducedInFactory ?? 0)} onChange={e => updateKey('ProducedInFactory', +e.target.value)}>
          {FACTORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      <Field label="Basic resource factory" tooltip="BasicResourceFactory block id; 0 means none.">
        <BlockIdSelect blocks={blocks} value={Number(value.BasicResourceFactory ?? 0)} onChange={id => updateKey('BasicResourceFactory', id)} allowNone />
      </Field>
      <Field label="Bake time" tooltip="FactoryBakeTime value from XML.">
        <input type="number" min={0} step={0.1} value={Number(value.FactoryBakeTime ?? 0)} onChange={e => updateKey('FactoryBakeTime', +e.target.value)} />
      </Field>
      {'Factory' in value && (
        <Field label="Factory slot" tooltip="Factory input/output slot marker.">
          <select value={String(value.Factory ?? '')} onChange={e => updateKey('Factory', e.target.value)}>
            <option value="">None</option>
            <option value="INPUT">Input</option>
            <option value="OUTPUT">Output</option>
          </select>
        </Field>
      )}
    </div>
  );
}

function ChambersEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return (
    <div className="chambers-editor">
      <label className="inline-check">
        <input type="checkbox" checked={Boolean(value.GeneralChamber)} onChange={e => updateKey('GeneralChamber', e.target.checked)} />
        General chamber
      </label>
      <Field label="Capacity" tooltip="ChamberCapacity contribution.">
        <input type="number" step={0.01} value={Number(value.ChamberCapacity ?? 0)} onChange={e => updateKey('ChamberCapacity', +e.target.value)} />
      </Field>
      <Field label="Root chamber" tooltip="ChamberRoot block id.">
        <BlockIdSelect blocks={blocks} value={Number(value.ChamberRoot ?? 0)} onChange={id => updateKey('ChamberRoot', id)} allowNone />
      </Field>
      <Field label="Parent chamber" tooltip="ChamberParent block id.">
        <BlockIdSelect blocks={blocks} value={Number(value.ChamberParent ?? 0)} onChange={id => updateKey('ChamberParent', id)} allowNone />
      </Field>
      <Field label="Upgrades to" tooltip="ChamberUpgradesTo block id.">
        <BlockIdSelect blocks={blocks} value={Number(value.ChamberUpgradesTo ?? 0)} onChange={id => updateKey('ChamberUpgradesTo', id)} allowNone />
      </Field>
      <Field label="Permission" tooltip="ChamberPermission numeric mode from XML.">
        <input type="number" value={Number(value.ChamberPermission ?? 0)} onChange={e => updateKey('ChamberPermission', +e.target.value)} />
      </Field>
      <Field label="Config groups" tooltip="ChamberConfigGroups labels.">
        <StringElementListEditor value={normalizeElementList(value.ChamberConfigGroups)} onChange={items => updateKey('ChamberConfigGroups', serializeElementList(items))} addLabel="+ Add group" />
      </Field>
    </div>
  );
}

function ControllersEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return (
    <div className="controllers-editor">
      <ControllerListEditor title="Controlled by" value={normalizeElementList(value.ControlledBy)} blocks={blocks} onChange={items => updateKey('ControlledBy', serializeElementList(items))} />
      <ControllerListEditor title="Controls" value={normalizeElementList(value.Controlling)} blocks={blocks} onChange={items => updateKey('Controlling', serializeElementList(items))} />
      <div className="flags-grid">
        {(['MainCombinationController', 'SupportCombinationController', 'EffectCombinationController'] as const).map(key => (
          <label key={key} className="flag-toggle">
            <input type="checkbox" checked={Boolean(value[key])} onChange={e => updateKey(key, e.target.checked)} />
            {formatPropertyLabel(key)}
          </label>
        ))}
      </div>
    </div>
  );
}

function ControllerListEditor({ title, value, blocks, onChange }: { title: string; value: string[]; blocks: BlockDef[]; onChange: (value: string[]) => void }) {
  return (
    <Field label={title} tooltip="Stores BlockTypes keys in XML.">
      <ElementListEditor value={value} blocks={blocks} onChange={onChange} addLabel={`+ Add ${title.toLowerCase()}`} />
    </Field>
  );
}

function BlockTypeSelect({ blocks, value, onChange }: { blocks: BlockDef[]; value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">None</option>
      {blocks.map(block => (
        <option key={block.id} value={block.xmlTypeName}>{block.xmlTypeName} — {block.name}</option>
      ))}
    </select>
  );
}

function BlockIdSelect({ blocks, value, onChange, allowNone = false }: { blocks: BlockDef[]; value: number; onChange: (value: number) => void; allowNone?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(+e.target.value)}>
      {allowNone && <option value={0}>0 — None</option>}
      {blocks.map(block => (
        <option key={block.id} value={block.id}>{block.id} — {block.name}</option>
      ))}
    </select>
  );
}

function StringElementListEditor({ value, onChange, addLabel }: { value: string[]; onChange: (value: string[]) => void; addLabel: string }) {
  return (
    <div className="element-list-editor">
      {value.map((item, index) => (
        <div key={index} className="element-row">
          <input value={item} onChange={e => onChange(value.map((current, i) => i === index ? e.target.value : current))} />
          <button type="button" className="btn-secondary" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, ''])}>{addLabel}</button>
    </div>
  );
}

function ExtraValueEditor({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  if (typeof value === 'boolean') {
    return <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />;
  }

  if (typeof value === 'number') {
    return <input type="number" value={value} step={Number.isInteger(value) ? 1 : 0.01} onChange={e => onChange(+e.target.value)} />;
  }

  if (typeof value === 'string') {
    const multiline = value.length > 70 || value.includes('\n');
    if (multiline) {
      return <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} />;
    }
    return <input value={value} onChange={e => onChange(e.target.value)} />;
  }

  if (Array.isArray(value)) {
    return (
      <div className="extra-array-editor">
        {value.map((item, index) => (
          <div key={index} className="extra-array-item">
            <span className="extra-array-index">#{index + 1}</span>
            <ExtraValueEditor
              value={item}
              onChange={next => onChange(value.map((current, i) => i === index ? next : current))}
            />
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return (
      <div className="extra-object-editor">
        {Object.entries(objectValue).map(([key, nestedValue]) => (
          <div key={key} className="extra-object-row">
            <label>{formatPropertyLabel(key)}</label>
            <ExtraValueEditor
              value={nestedValue}
              onChange={next => onChange({ ...objectValue, [key]: next })}
            />
          </div>
        ))}
      </div>
    );
  }

  return <input value="" onChange={e => onChange(e.target.value)} />;
}

function formatPropertyLabel(key: string): string {
  const cleaned = key.replace(/^@_/, '').replace(/^#/, '');
  return cleaned
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^text$/i, 'Value')
    .replace(/^count$/i, 'Count');
}
