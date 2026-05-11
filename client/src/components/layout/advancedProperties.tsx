/**
 * @fileoverview Advanced / extra property editors for the block properties panel.
 *
 * This module handles all BlockConfig.xml properties that fall outside the
 * "core" fields (HP, mass, shape flags, etc.) exposed directly in Properties.tsx.
 * It is split into several specialised sub-editors, each targeting a logical
 * subsystem of the StarMade block configuration format:
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │ ExtraPropertiesEditor   — top-level dispatcher + search/filter  │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ ResourceRecipeEditor    — Consistence, InRecipe, Buy resources  │
 *  │ FactoryProductionEditor — ProducedInFactory, BakeTime, etc.     │
 *  │ ChambersEditor          — reactor chamber tree                  │
 *  │ ControllersEditor       — ControlledBy / Controlling chains     │
 *  │ CollisionPhysicalEditor — Physical flags + collision shapes     │
 *  │ LodMeshEditor           — LOD mesh names + activation style     │
 *  │ LogicGameplayEditor     — Sensor, Beacon, ResourceInjection…    │
 *  │ ExtraValueEditor        — generic editor for unknown key types   │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * ## XML serialisation round-trip
 * StarMade's BlockConfig.xml uses fast-xml-parser which represents:
 *  - boolean text nodes as JS booleans
 *  - single-item arrays as plain objects (not arrays)
 *  - attributes with the `@_` prefix
 *  - text content of mixed nodes as `#text`
 *
 * The normalise/serialize helper pairs (`normalizeResourceList` /
 * `serializeResourceList`, etc.) handle this mapping transparently so
 * the editors always work with clean JS types internally.
 *
 * @module advancedProperties
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { blockStyleName } from '../../3d/geometries/index.js';
import type { BlockDef } from '../../store/blockStore.js';
import { BlockIdSelect, BlockTypeSelect, Field } from './propertyControls.js';
import {
  BLOCK_STYLES,
  EXTRA_PROPERTY_GROUPS,
  formatPropertyLabel,
  getBlockStyleName,
  getFactoryOptions,
  getLodAnimationOptions,
  getResourceInjectionOptions,
  getResourceTypeOptions,
  getSlabOptions,
  localiseGroupTitle,
  tooltipForExtraPropertyL10n,
} from './propertyOptions.js';
import { useT } from '../../i18n/index.js';

// =============================================================================
// ExtraPropertiesEditor — top-level dispatcher
// =============================================================================

/**
 * Top-level editor for all `extraProperties` keys stored in the block draft.
 *
 * Renders a searchable, grouped accordion of property editors.
 * Known property groups (Resources, Factory, Chambers, etc.) use dedicated
 * sub-editors. All other keys fall into the "Other" group and use the
 * generic `ExtraValueEditor`.
 *
 * The search box filters across key names, formatted labels, and serialised
 * values so users can find any property by partial match.
 *
 * @component
 *
 * @param {Record<string, unknown>} value   The `extraProperties` object from the block draft.
 * @param {BlockDef[]}              blocks  All loaded blocks (used for block-reference selects).
 * @param {(value: Record<string, unknown>) => void} onChange
 *        Called whenever any property is changed, with the complete updated object.
 */
export function ExtraPropertiesEditor({ value, blocks, onChange }: {
  value: Record<string, unknown>;
  blocks: BlockDef[];
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const [filter, setFilter] = useState('');

  // Keys that are handled by a named group editor.
  const grouped = new Set(EXTRA_PROPERTY_GROUPS.flatMap(group => group.keys));

  // Keys present in `value` that are not in any named group → "Other".
  const otherKeys = Object.keys(value).filter(key => !grouped.has(key)).sort();

  const normalizedFilter = filter.trim().toLowerCase();

  /**
   * Determine whether a property key passes the current search filter.
   * Matches against the raw key, the formatted label, and the stringified value.
   *
   * @param {string} key Property key to test.
   * @returns {boolean} True if the key should be shown.
   */
  const matchesFilter = (key: string) => {
    if (!normalizedFilter) return true;
    return (
      key.toLowerCase().includes(normalizedFilter) ||
      formatPropertyLabel(key).toLowerCase().includes(normalizedFilter) ||
      JSON.stringify(value[key] ?? '').toLowerCase().includes(normalizedFilter)
    );
  };

  // Build visible groups: only include groups that have at least one matching key
  // present in `value`.
  const groups = [
    ...EXTRA_PROPERTY_GROUPS
      .map(group => ({
        ...group,
        keys: group.keys.filter(key => key in value && matchesFilter(key)),
      }))
      .filter(group => group.keys.length > 0),
    ...(otherKeys.filter(matchesFilter).length > 0
      ? [{ title: 'Other', keys: otherKeys.filter(matchesFilter) }]
      : []),
  ];

  const propertyCount = Object.keys(value).length;

  if (propertyCount === 0) {
    return <div className="variant-empty">{t.advanced.noProperties}</div>;
  }

  /** Update a single key in the extra properties object. */
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="extra-properties-editor">
      {/* Search / filter toolbar */}
      <div className="extra-properties-toolbar">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder={t.advanced.searchPlaceholder(propertyCount)}
        />
        {filter && (
          <button type="button" className="btn-secondary" onClick={() => setFilter('')}>
            {t.advanced.clear}
          </button>
        )}
      </div>

      {/* No-match message */}
      {groups.length === 0 && (
        <div className="variant-empty">{t.advanced.noMatch(filter)}</div>
      )}

      {/* Property group accordion */}
      {groups.map(group => (
        <details
          key={group.title}
          className="extra-property-group"
          // Keep group open while searching; collapse "Other" by default.
          open={normalizedFilter !== '' || group.title !== 'Other'}
        >
          <summary>
            <span>{localiseGroupTitle(group.title, t)}</span>
            <span className="extra-property-count">{group.keys.length}</span>
          </summary>
          <div className="extra-property-fields">
            {/* Dispatch to the appropriate sub-editor for each known group */}
            {group.title === 'Resources / Recipes' ? (
              <ResourceRecipeEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Factory / Production' ? (
              <FactoryProductionEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Chambers' ? (
              <ChambersEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Controllers' ? (
              <ControllersEditor value={value} blocks={blocks} onChange={onChange} />
            ) : group.title === 'Collision / Physical' ? (
              <CollisionPhysicalEditor value={value} onChange={onChange} />
            ) : group.title === 'LOD / Mesh' ? (
              <LodMeshEditor value={value} onChange={onChange} />
            ) : group.title === 'Logic / Gameplay' ? (
              <LogicGameplayEditor value={value} onChange={onChange} />
            ) : (
              // Generic editor for all "Other" keys
              group.keys.map(key => (
                <Field key={key} label={formatPropertyLabel(key)} tooltip={tooltipForExtraPropertyL10n(key, t)}>
                  <ExtraValueEditor value={value[key]} onChange={next => updateKey(key, next)} />
                </Field>
              ))
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

// =============================================================================
// ResourceEntry type
// =============================================================================

/**
 * A single entry in a resource list (Consistence / CubatomConsistence).
 *
 * StarMade serialises these as XML `<Item count="N">TYPE_NAME</Item>` nodes.
 * After normalisation they become flat JS objects with `name` and `count`.
 */
export type ResourceEntry = { name: string; count: number };

// =============================================================================
// ResourceRecipeEditor
// =============================================================================

/**
 * Editor for the Resources / Recipes property group.
 *
 * Covers:
 *  - `InRecipe`          — toggles participation in the recipe system
 *  - `BlockResourceType` — economy category (ore, plant, basic, etc.)
 *  - `RecipeBuyResource` — additional buy-recipe resource types (Element list)
 *  - `Consistence`       — primary crafting material list (Item list)
 *  - `CubatomConsistence`— cubatom-specific material list
 *
 * When `InRecipe` is false the recipe fields are hidden to avoid confusion.
 * Values are preserved in the draft even while hidden.
 *
 * @component
 * @private
 */
function ResourceRecipeEditor({ value, blocks, onChange }: {
  value: Record<string, unknown>;
  blocks: BlockDef[];
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  const inRecipe = Boolean(value.InRecipe);

  return (
    <div className="resource-recipe-editor">
      <div className="resource-summary-card">
        <div>
          <strong>{t.advanced.recipeTitle}</strong>
          <p>{t.advanced.recipeDesc}</p>
        </div>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={inRecipe}
            onChange={e => updateKey('InRecipe', e.target.checked)}
          />
          {t.advanced.inRecipe}
        </label>
      </div>

      {!inRecipe ? (
        <div className="variant-empty">{t.advanced.recipeInactive}</div>
      ) : (
        <>
          <div className="resource-two-col">
            {/* BlockResourceType — economy category */}
            <Field label={t.advanced.resourceCategory} tooltip={tooltipForExtraPropertyL10n('BlockResourceType', t)}>
              <select
                value={Number(value.BlockResourceType ?? 2)}
                onChange={e => updateKey('BlockResourceType', +e.target.value)}
              >
                {getResourceTypeOptions(t).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>

            {/* RecipeBuyResource — list of block types required to buy this block */}
            <Field label={t.advanced.buyResources} tooltip={tooltipForExtraPropertyL10n('RecipeBuyResource', t)}>
              <ElementListEditor
                value={normalizeElementList(value.RecipeBuyResource)}
                blocks={blocks}
                onChange={items => updateKey('RecipeBuyResource', serializeElementList(items))}
                addLabel={t.advanced.addBuyResource}
              />
            </Field>
          </div>

          {/* Consistence — primary material requirements */}
          <ResourceListEditor
            title={t.advanced.materialReqs}
            help={tooltipForExtraPropertyL10n('Consistence', t)}
            value={normalizeResourceList(value.Consistence)}
            blocks={blocks}
            addLabel={t.advanced.addMaterial}
            onChange={items => updateKey('Consistence', serializeResourceList(items))}
          />

          {/* CubatomConsistence — cubatom-specific materials (advanced / specialized) */}
          <details className="resource-subsection">
            <summary>{t.advanced.cubatomTitle} <span>{t.advanced.cubatomSpec}</span></summary>
            <ResourceListEditor
              title={t.advanced.cubatomTitle}
              help={tooltipForExtraPropertyL10n('CubatomConsistence', t)}
              value={normalizeResourceList(value.CubatomConsistence)}
              blocks={blocks}
              addLabel={t.advanced.addCubatom}
              onChange={items => updateKey('CubatomConsistence', serializeResourceList(items))}
            />
          </details>
        </>
      )}
    </div>
  );
}

// =============================================================================
// ResourceListEditor
// =============================================================================

/**
 * Editable list of `ResourceEntry` items (Consistence / CubatomConsistence).
 *
 * Each item has a count (number) and a block type name (selected via
 * `BlockTypeSelect`). Entries can be added, edited, or removed individually.
 *
 * @component
 * @private
 */
function ResourceListEditor({ title, help, value, blocks, addLabel, onChange }: {
  title: string;
  help: string;
  value: ResourceEntry[];
  blocks: BlockDef[];
  addLabel: string;
  onChange: (value: ResourceEntry[]) => void;
}) {
  const t = useT();
  /**
   * Apply a partial patch to one item at `index`, leaving others unchanged.
   *
   * @param {number} index Entry index to update.
   * @param {Partial<ResourceEntry>} patch Fields to merge into the entry.
   */
  const update = (index: number, patch: Partial<ResourceEntry>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="resource-list-editor">
      <div className="resource-list-header">
        <div>
          <strong>{title}</strong>
          <p>{help}</p>
        </div>
        {/* Add a new entry using the first available block type as default */}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onChange([...value, { name: blocks[0]?.xmlTypeName ?? '', count: 1 }])}
        >
          {addLabel}
        </button>
      </div>

      {value.length === 0 ? (
        <div className="variant-empty">{t.advanced.noResources}</div>
      ) : (
        value.map((item, index) => (
          <div key={index} className="resource-row">
            {/* Item count */}
            <input
              className="resource-count"
              type="number"
              min={0}
              value={item.count}
              onChange={e => update(index, { count: +e.target.value })}
            />
            {/* Block type selector */}
            <BlockTypeSelect
              blocks={blocks}
              value={item.name}
              onChange={name => update(index, { name })}
            />
            {/* Remove button */}
            <button
              type="button"
              className="btn-secondary"
              title={t.advanced.noResources}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// =============================================================================
// ElementListEditor
// =============================================================================

/**
 * Editable list of block type names stored as an XML Element list.
 *
 * Used for `RecipeBuyResource`, controller `ControlledBy` / `Controlling`,
 * and other fields that hold a variable-length list of XML type name strings.
 *
 * @component
 * @private
 */
function ElementListEditor({ value, blocks, onChange, addLabel }: {
  value: string[];
  blocks: BlockDef[];
  onChange: (value: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="element-list-editor">
      {value.map((item, index) => (
        <div key={index} className="element-row">
          {/* Block type selector for this entry */}
          <BlockTypeSelect
            blocks={blocks}
            value={item}
            onChange={name => onChange(value.map((current, i) => (i === index ? name : current)))}
          />
          {/* Remove button */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {/* Add new entry using the first available block type as default */}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange([...value, blocks[0]?.xmlTypeName ?? ''])}
      >
        {addLabel}
      </button>
    </div>
  );
}

// =============================================================================
// FactoryProductionEditor
// =============================================================================

/**
 * Editor for the Factory / Production property group.
 *
 * Covers:
 *  - `ProducedInFactory`   — which factory tier produces this block
 *  - `BasicResourceFactory`— linked basic-resource factory block (block ID)
 *  - `FactoryBakeTime`     — production time in game ticks
 *  - `Factory`             — input/output slot role (only shown when key exists)
 *
 * @component
 * @private
 */
function FactoryProductionEditor({ value, blocks, onChange }: {
  value: Record<string, unknown>;
  blocks: BlockDef[];
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="production-editor">
      {/* ProducedInFactory — factory tier */}
      <Field label={t.advanced.producedIn} tooltip={tooltipForExtraPropertyL10n('ProducedInFactory', t)}>
        <select
          value={Number(value.ProducedInFactory ?? 0)}
          onChange={e => updateKey('ProducedInFactory', +e.target.value)}
        >
          {getFactoryOptions(t).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>

      {/* BasicResourceFactory — linked factory block */}
      <Field label={t.advanced.basicFactory} tooltip={tooltipForExtraPropertyL10n('BasicResourceFactory', t)}>
        <BlockIdSelect
          blocks={blocks}
          value={Number(value.BasicResourceFactory ?? 0)}
          onChange={id => updateKey('BasicResourceFactory', id)}
          allowNone
        />
      </Field>

      {/* FactoryBakeTime — production duration */}
      <Field label={t.advanced.bakeTime} tooltip={tooltipForExtraPropertyL10n('FactoryBakeTime', t)}>
        <input
          type="number"
          min={0}
          step={0.1}
          value={Number(value.FactoryBakeTime ?? 0)}
          onChange={e => updateKey('FactoryBakeTime', +e.target.value)}
        />
      </Field>

      {/* Factory slot role — only rendered when the key is explicitly present */}
      {'Factory' in value && (
        <Field label={t.advanced.factorySlot} tooltip={tooltipForExtraPropertyL10n('Factory', t)}>
          <select
            value={String(value.Factory ?? '')}
            onChange={e => updateKey('Factory', e.target.value)}
          >
            <option value="">{t.advanced.factoryNone}</option>
            <option value="INPUT">{t.advanced.factoryInput}</option>
            <option value="OUTPUT">{t.advanced.factoryOutput}</option>
          </select>
        </Field>
      )}
    </div>
  );
}

// =============================================================================
// ChambersEditor
// =============================================================================

/**
 * Editor for reactor chamber properties.
 *
 * StarMade's reactor system uses a tree of chamber blocks. Each chamber block
 * carries a set of fields that describe its position in the upgrade tree,
 * its capacity contribution, and its configuration groups.
 *
 * Covers:
 *  - `GeneralChamber`         — root-capable chamber flag
 *  - `ChamberCapacity`        — capacity contribution
 *  - `ChamberRoot`            — root chamber reference (block ID)
 *  - `ChamberParent`          — parent chamber reference (block ID)
 *  - `ChamberUpgradesTo`      — upgrade target (block ID)
 *  - `ChamberPermission`      — access permission level
 *  - `ChamberConfigGroups`    — configuration group names (string list)
 *
 * @component
 * @private
 */
function ChambersEditor({ value, blocks, onChange }: {
  value: Record<string, unknown>;
  blocks: BlockDef[];
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="chambers-editor">
      {/* GeneralChamber toggle */}
      <label className="inline-check" title={tooltipForExtraPropertyL10n('GeneralChamber', t)}>
        <input
          type="checkbox"
          checked={Boolean(value.GeneralChamber)}
          onChange={e => updateKey('GeneralChamber', e.target.checked)}
        />
        {t.advanced.generalChamber}{' '}
        <span className="field-help" aria-label={tooltipForExtraPropertyL10n('GeneralChamber', t)}>ⓘ</span>
      </label>

      {/* ChamberCapacity */}
      <Field label={t.advanced.capacity} tooltip={tooltipForExtraPropertyL10n('ChamberCapacity', t)}>
        <input
          type="number"
          step={0.01}
          value={Number(value.ChamberCapacity ?? 0)}
          onChange={e => updateKey('ChamberCapacity', +e.target.value)}
        />
      </Field>

      {/* ChamberRoot */}
      <Field label={t.advanced.rootChamber} tooltip={tooltipForExtraPropertyL10n('ChamberRoot', t)}>
        <BlockIdSelect
          blocks={blocks}
          value={Number(value.ChamberRoot ?? 0)}
          onChange={id => updateKey('ChamberRoot', id)}
          allowNone
        />
      </Field>

      {/* ChamberParent */}
      <Field label={t.advanced.parentChamber} tooltip={tooltipForExtraPropertyL10n('ChamberParent', t)}>
        <BlockIdSelect
          blocks={blocks}
          value={Number(value.ChamberParent ?? 0)}
          onChange={id => updateKey('ChamberParent', id)}
          allowNone
        />
      </Field>

      {/* ChamberUpgradesTo */}
      <Field label={t.advanced.upgradesTo} tooltip={tooltipForExtraPropertyL10n('ChamberUpgradesTo', t)}>
        <BlockIdSelect
          blocks={blocks}
          value={Number(value.ChamberUpgradesTo ?? 0)}
          onChange={id => updateKey('ChamberUpgradesTo', id)}
          allowNone
        />
      </Field>

      {/* ChamberPermission */}
      <Field label={t.advanced.permission} tooltip={tooltipForExtraPropertyL10n('ChamberPermission', t)}>
        <input
          type="number"
          value={Number(value.ChamberPermission ?? 0)}
          onChange={e => updateKey('ChamberPermission', +e.target.value)}
        />
      </Field>

      {/* ChamberConfigGroups — plain string list */}
      <Field label={t.advanced.configGroups} tooltip={tooltipForExtraPropertyL10n('ChamberConfigGroups', t)}>
        <StringElementListEditor
          value={normalizeElementList(value.ChamberConfigGroups)}
          onChange={items => updateKey('ChamberConfigGroups', serializeElementList(items))}
          addLabel={t.advanced.addGroup}
        />
      </Field>
    </div>
  );
}

// =============================================================================
// ControllersEditor
// =============================================================================

/**
 * Editor for controller relationship properties.
 *
 * StarMade's combination controller system allows blocks to declare which
 * block types can control them and which block types they can control.
 *
 * Covers:
 *  - `ControlledBy`                 — list of controller XML type names
 *  - `Controlling`                  — list of controlled block XML type names
 *  - `MainCombinationController`    — flag: main controller role
 *  - `SupportCombinationController` — flag: support controller role
 *  - `EffectCombinationController`  — flag: effect controller role
 *
 * @component
 * @private
 */
function ControllersEditor({ value, blocks, onChange }: {
  value: Record<string, unknown>;
  blocks: BlockDef[];
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="controllers-editor">
      {/* ControlledBy — which controllers can drive this block */}
      <ControllerListEditor
        title={t.advanced.controlledBy}
        value={normalizeElementList(value.ControlledBy)}
        blocks={blocks}
        onChange={items => updateKey('ControlledBy', serializeElementList(items))}
        addLabelOverride={t.advanced.addControlledBy}
      />

      {/* Controlling — which blocks this controller drives */}
      <ControllerListEditor
        title={t.advanced.controls}
        value={normalizeElementList(value.Controlling)}
        blocks={blocks}
        onChange={items => updateKey('Controlling', serializeElementList(items))}
        addLabelOverride={t.advanced.addControls}
      />

      {/* Combination controller role flags */}
      <div className="flags-grid">
        {(['MainCombinationController', 'SupportCombinationController', 'EffectCombinationController'] as const).map(key => (
          <label key={key} className="flag-toggle" title={tooltipForExtraPropertyL10n(key, t)}>
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={e => updateKey(key, e.target.checked)}
            />
            {formatPropertyLabel(key)}{' '}
            <span className="field-help" aria-label={tooltipForExtraPropertyL10n(key, t)}>ⓘ</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Single controller relationship list with a labelled Field wrapper.
 *
 * @component
 * @private
 */
function ControllerListEditor({ title, value, blocks, onChange, addLabelOverride }: {
  title: string;
  value: string[];
  blocks: BlockDef[];
  onChange: (value: string[]) => void;
  addLabelOverride?: string;
}) {
  const t = useT();
  const tooltip = title === t.advanced.controlledBy
    ? tooltipForExtraPropertyL10n('ControlledBy', t)
    : tooltipForExtraPropertyL10n('Controlling', t);
  const addLabel = addLabelOverride ?? `+ Add ${title.toLowerCase()}`;

  return (
    <Field label={title} tooltip={tooltip}>
      <ElementListEditor
        value={value}
        blocks={blocks}
        onChange={onChange}
        addLabel={addLabel}
      />
    </Field>
  );
}
// =============================================================================

/**
 * Editor for physical and collision properties.
 *
 * Covers boolean flags: Physical, CubeCubeCollision, LodCollisionPhysical,
 * UseDetailedCollisionForAstronautMode, Enterable.
 * Plus two `CollisionShapeEditor` instances for default and astronaut-mode shapes.
 *
 * @component
 * @private
 */
function CollisionPhysicalEditor({ value, onChange }: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  /** Boolean flag keys rendered as toggles. */
  const bools = [
    'Physical',
    'CubeCubeCollision',
    'LodCollisionPhysical',
    'UseDetailedCollisionForAstronautMode',
    'Enterable',
  ] as const;

  return (
    <div className="collision-editor">
      {/* Boolean collision flags */}
      {bools.map(key => (
        <label key={key} className="inline-check" title={tooltipForExtraPropertyL10n(key, t)}>
          <input
            type="checkbox"
            checked={Boolean(value[key])}
            onChange={e => updateKey(key, e.target.checked)}
          />
          {formatPropertyLabel(key)}{' '}
          <span className="field-help" aria-label={tooltipForExtraPropertyL10n(key, t)}>ⓘ</span>
        </label>
      ))}

      {/* Default collision shape (used in normal gameplay) */}
      <CollisionShapeEditor
        label={t.advanced.defaultCollision}
        value={value.CollisionDefault}
        onChange={next => updateKey('CollisionDefault', next)}
      />

      {/* Detailed astronaut-mode collision shape */}
      <CollisionShapeEditor
        label={t.advanced.astronautCollision}
        value={value.DetailedCollisionForAstronautMode}
        onChange={next => updateKey('DetailedCollisionForAstronautMode', next)}
      />
    </div>
  );
}

// =============================================================================
// CollisionShapeEditor
// =============================================================================

/**
 * Editor for a single StarMade collision shape definition.
 *
 * StarMade supports three collision shape types:
 *  - `None`       — no collision
 *  - `BlockType`  — uses a named block style + slab thickness
 *  - `ConvexHull` — uses a named convex-hull mesh resource
 *
 * The shape is stored as an XML attribute-heavy object in BlockConfig.xml:
 * `{ "@_type": "BlockType", "StyleId": 0, "@_slab": "0" }`.
 *
 * @component
 * @private
 */
function CollisionShapeEditor({ label, value, onChange }: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const t = useT();
  const shape = normalizeCollisionShape(value);

  return (
    <Field
      label={label}
      tooltip={t.advanced.collisionTooltip}
    >
      <div className="collision-shape-editor">
        {/* Shape type selector */}
        <select
          value={shape.type}
          onChange={e => onChange(defaultCollisionShape(e.target.value))}
        >
          <option value="None">{t.advanced.collisionNone}</option>
          <option value="BlockType">{t.advanced.collisionBlockType}</option>
          <option value="ConvexHull">{t.advanced.collisionConvex}</option>
        </select>

        {/* BlockType fields: style ID + slab thickness */}
        {shape.type === 'BlockType' && (
          <>
            <select
              value={shape.styleId}
              onChange={e => onChange({ ...shape.raw, '@_type': 'BlockType', StyleId: +e.target.value })}
            >
              {BLOCK_STYLES.map(style => (
                <option key={style} value={style}>{getBlockStyleName(style, t)}</option>
              ))}
            </select>
            <select
              value={shape.slab}
              onChange={e => onChange({ ...shape.raw, '@_type': 'BlockType', '@_slab': String(+e.target.value) })}
            >
              {getSlabOptions(t).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </>
        )}

        {/* ConvexHull field: mesh resource name */}
        {shape.type === 'ConvexHull' && (
          <input
            value={shape.mesh}
            placeholder={t.advanced.collisionMeshPlaceholder}
            onChange={e => onChange({ ...shape.raw, '@_type': 'ConvexHull', Mesh: e.target.value })}
          />
        )}
      </div>
    </Field>
  );
}

// =============================================================================
// LodMeshEditor
// =============================================================================

/**
 * Editor for LOD (Level of Detail) mesh properties.
 *
 * Covers:
 *  - `LodShape`                  — default LOD mesh resource name
 *  - `LodShapeSwitchStyleActive` — active-state LOD mesh resource name
 *  - `LodActivationAnimationStyle` — switch behaviour (0=none, 1=use active LOD)
 *
 * LOD meshes are low-polygon representations used by the engine when a block
 * is rendered at distance. Named mesh resources reference `.smb` / `.obj` files
 * in the StarMade game data directory.
 *
 * @component
 * @private
 */
function LodMeshEditor({ value, onChange }: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="lod-editor">
      {/* Default LOD mesh name */}
      <Field label={t.advanced.defaultLod} tooltip={tooltipForExtraPropertyL10n('LodShape', t)}>
        <input
          value={String(value.LodShape ?? '')}
          onChange={e => updateKey('LodShape', e.target.value)}
        />
      </Field>

      {/* Active-state LOD mesh name (only relevant when LodActivationAnimationStyle=1) */}
      <Field label={t.advanced.activeLod} tooltip={tooltipForExtraPropertyL10n('LodShapeSwitchStyleActive', t)}>
        <input
          value={String(value.LodShapeSwitchStyleActive ?? '')}
          onChange={e => updateKey('LodShapeSwitchStyleActive', e.target.value)}
        />
      </Field>

      {/* LOD activation behaviour */}
      <Field label={t.advanced.activationLodBehavior} tooltip={tooltipForExtraPropertyL10n('LodActivationAnimationStyle', t)}>
        <select
          value={Number(value.LodActivationAnimationStyle ?? 0)}
          onChange={e => updateKey('LodActivationAnimationStyle', +e.target.value)}
        >
          {getLodAnimationOptions(t).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

// =============================================================================
// LogicGameplayEditor
// =============================================================================

/**
 * Editor for logic and gameplay properties.
 *
 * Covers boolean flags (SensorInput, DrawLogicConnection, LogicSignaledByRail,
 * LogicBlockButton, Beacon) and:
 *  - `ResourceInjection`  — world-generation resource injection mode
 *  - `ExplosionAbsorbtion`— explosion energy absorption factor
 *
 * @component
 * @private
 */
function LogicGameplayEditor({ value, onChange }: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useT();
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  /** Boolean flag keys rendered as toggles. */
  const flags = [
    'SensorInput',
    'DrawLogicConnection',
    'LogicSignaledByRail',
    'LogicBlockButton',
    'Beacon',
  ] as const;

  return (
    <div className="logic-editor">
      {/* Boolean logic flags */}
      <div className="flags-grid">
        {flags.map(key => (
          <label key={key} className="flag-toggle" title={tooltipForExtraPropertyL10n(key, t)}>
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={e => updateKey(key, e.target.checked)}
            />
            {formatPropertyLabel(key)}{' '}
            <span className="field-help" aria-label={tooltipForExtraPropertyL10n(key, t)}>ⓘ</span>
          </label>
        ))}
      </div>

      {/* ResourceInjection — terrain/flora injection mode */}
      <Field label={t.advanced.resourceInjection} tooltip={tooltipForExtraPropertyL10n('ResourceInjection', t)}>
        <select
          value={Number(value.ResourceInjection ?? 0)}
          onChange={e => updateKey('ResourceInjection', +e.target.value)}
        >
          {getResourceInjectionOptions(t).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>

      {/* ExplosionAbsorbtion — damage absorption factor */}
      <Field label={t.advanced.explosionAbsorption} tooltip={tooltipForExtraPropertyL10n('ExplosionAbsorbtion', t)}>
        <input
          type="number"
          step={0.01}
          value={Number(value.ExplosionAbsorbtion ?? 0)}
          onChange={e => updateKey('ExplosionAbsorbtion', +e.target.value)}
        />
      </Field>
    </div>
  );
}

// =============================================================================
// StringElementListEditor
// =============================================================================

/**
 * Editable list of plain strings (no block-type select).
 *
 * Used for `ChamberConfigGroups` and similar fields that store a list of
 * plain string identifiers rather than block type names.
 *
 * @component
 * @private
 */
function StringElementListEditor({ value, onChange, addLabel }: {
  value: string[];
  onChange: (value: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="element-list-editor">
      {value.map((item, index) => (
        <div key={index} className="element-row">
          <input
            value={item}
            onChange={e => onChange(value.map((current, i) => (i === index ? e.target.value : current)))}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange([...value, ''])}
      >
        {addLabel}
      </button>
    </div>
  );
}

// =============================================================================
// ExtraValueEditor — generic type-based editor
// =============================================================================

/**
 * Generic value editor for unknown/unrecognised property types.
 *
 * Renders the appropriate input based on the runtime type of `value`:
 *  - `boolean`  → checkbox
 *  - `number`   → number input (step=1 for integers, 0.01 for floats)
 *  - `string`   → text input (or textarea if >70 chars or contains newlines)
 *  - `Array`    → recursive numbered list of ExtraValueEditors
 *  - `object`   → recursive key→value rows of ExtraValueEditors
 *  - other/null → empty text input
 *
 * @component
 * @private
 */
function ExtraValueEditor({ value, onChange }: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (typeof value === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
      />
    );
  }

  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        step={Number.isInteger(value) ? 1 : 0.01}
        onChange={e => onChange(+e.target.value)}
      />
    );
  }

  if (typeof value === 'string') {
    // Use a multi-line textarea for long strings or strings containing newlines.
    return value.length > 70 || value.includes('\n') ? (
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    ) : (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="extra-array-editor">
        {value.map((item, index) => (
          <div key={index} className="extra-array-item">
            <span className="extra-array-index">#{index + 1}</span>
            <ExtraValueEditor
              value={item}
              onChange={next =>
                onChange(value.map((current, i) => (i === index ? next : current)))
              }
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

  // Fallback for null / undefined / unknown types.
  return (
    <input
      value=""
      onChange={e => onChange(e.target.value)}
    />
  );
}

// =============================================================================
// Normalisation / serialisation helpers
// =============================================================================

/**
 * Normalise a raw BlockConfig.xml resource list value into a flat
 * `ResourceEntry[]` array.
 *
 * StarMade (via fast-xml-parser) represents resource lists in several forms:
 *  - `undefined` / `''`                → empty list
 *  - `{ Item: { '#text': 'X', '@_count': '2' } }` → single item (object, not array)
 *  - `{ Item: [{ '#text': 'X', '@_count': '2' }, …] }` → multiple items
 *  - `{ '#text': 'X', '@_count': '2' }`→ direct item object (Consistence shorthand)
 *  - `Array` of any of the above       → unwrap recursively (CubatomConsistence)
 *
 * @param {unknown} raw Raw value from `extraProperties`.
 * @returns {ResourceEntry[]} Normalised list of resource entries.
 */
export function normalizeResourceList(raw: unknown): ResourceEntry[] {
  if (!raw || raw === '') return [];
  if (Array.isArray(raw)) return raw.flatMap(normalizeResourceList);
  if (typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;

  // `{ Item: … }` or `{ item: … }` wrapper — handle both casings.
  const item = obj.Item ?? obj.item;
  if (item !== undefined) {
    return normalizeResourceItems(Array.isArray(item) ? item : [item]);
  }

  // Direct item object: `{ '#text': 'TYPE', '@_count': '2' }`.
  if ('#text' in obj || '@_count' in obj) {
    return normalizeResourceItems([obj]);
  }

  return [];
}

/**
 * Convert a raw array of fast-xml-parser item objects into clean `ResourceEntry` values.
 *
 * Non-object entries are filtered out. Missing `#text` defaults to `''` and
 * missing `@_count` defaults to `1`.
 *
 * @param {unknown[]} items Raw item objects from the parser.
 * @returns {ResourceEntry[]} Cleaned resource entries.
 */
function normalizeResourceItems(items: unknown[]): ResourceEntry[] {
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      name:  String(item['#text'] ?? ''),
      count: Number(item['@_count'] ?? 1),
    }));
}

/**
 * Serialise a `ResourceEntry[]` back to the XML object format expected by
 * fast-xml-parser / BlockConfig.xml.
 *
 * Empty-name entries are filtered out before serialisation.
 * Returns `''` (empty string) when the cleaned list is empty, which signals
 * the XML builder to omit the element entirely.
 *
 * @param {ResourceEntry[]} items Entries to serialise.
 * @returns {Record<string, unknown> | string} XML-ready object or `''` if empty.
 */
export function serializeResourceList(items: ResourceEntry[]): Record<string, unknown> | string {
  const clean = items.filter(item => item.name.trim());
  if (clean.length === 0) return '';
  return {
    Item: clean.map(item => ({
      '#text':   item.name.trim(),
      '@_count': String(Math.max(0, item.count || 0)),
    })),
  };
}

/**
 * Normalise a raw BlockConfig.xml Element list into a plain string array.
 *
 * StarMade uses `<Element>TYPE</Element>` nodes to store lists of block type
 * names. fast-xml-parser collapses a single element to a string, and multiple
 * elements to an array, so both forms must be handled.
 *
 * @param {unknown} raw Raw value from `extraProperties`.
 * @returns {string[]} Flat array of element strings.
 */
export function normalizeElementList(raw: unknown): string[] {
  if (!raw || raw === '') return [];
  if (typeof raw === 'string') return [raw].filter(Boolean);
  if (Array.isArray(raw)) return raw.flatMap(normalizeElementList);
  if (typeof raw !== 'object') return [];

  const element = (raw as Record<string, unknown>).Element;
  if (element === undefined) return [];
  return Array.isArray(element) ? element.map(String) : [String(element)];
}

/**
 * Serialise a string array back to the XML Element list format.
 *
 * Empty/whitespace-only strings are filtered out.
 * Returns `''` if the cleaned list is empty (omit the XML element).
 * Returns `{ Element: 'X' }` for a single item (not wrapped in an array).
 * Returns `{ Element: ['X', 'Y', …] }` for multiple items.
 *
 * @param {string[]} items String values to serialise.
 * @returns {Record<string, unknown> | string} XML-ready object or `''` if empty.
 */
export function serializeElementList(items: string[]): Record<string, unknown> | string {
  const clean = items.map(item => item.trim()).filter(Boolean);
  if (clean.length === 0) return '';
  return { Element: clean.length === 1 ? clean[0] : clean };
}

/**
 * Normalise a raw CollisionShape value into a strongly-typed shape descriptor.
 *
 * The XML representation is an attribute-heavy object:
 * `{ "@_type": "BlockType", "StyleId": 2, "@_slab": "1" }`
 * or
 * `{ "@_type": "ConvexHull", "Mesh": "collision_mesh" }`
 *
 * Missing fields default to safe values. The `raw` pass-through is preserved
 * so the editor can merge partial updates without losing unknown attributes.
 *
 * @param {unknown} value Raw value from `extraProperties`.
 * @returns {{ type: string; styleId: number; slab: number; mesh: string; raw: Record<string, unknown> }}
 *   Normalised shape descriptor.
 */
export function normalizeCollisionShape(value: unknown): {
  type: string;
  styleId: number;
  slab: number;
  mesh: string;
  raw: Record<string, unknown>;
} {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    type:    String(raw['@_type'] ?? 'None'),
    styleId: Number(raw.StyleId ?? 0),
    slab:    Number(raw['@_slab'] ?? 0),
    mesh:    String(raw.Mesh ?? ''),
    raw,
  };
}

/**
 * Create a default collision shape object for a given type string.
 *
 * Called when the user changes the shape type selector. Resets shape-specific
 * fields to sensible defaults while keeping the `@_type` attribute correct.
 *
 * @param {string} type Target shape type: `'BlockType'`, `'ConvexHull'`, or `'None'`.
 * @returns {Record<string, unknown>} Default XML-ready shape object.
 */
export function defaultCollisionShape(type: string): Record<string, unknown> {
  if (type === 'BlockType')  return { '@_type': 'BlockType',  StyleId: 0, '@_slab': '0' };
  if (type === 'ConvexHull') return { '@_type': 'ConvexHull', Mesh: '' };
  return { '@_type': 'None' };
}
