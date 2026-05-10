import React, { useState } from 'react';
import { blockStyleName } from '../../3d/geometries/index.js';
import type { BlockDef } from '../../store/blockStore.js';
import { BlockIdSelect, BlockTypeSelect, Field } from './propertyControls.js';
import {
  BLOCK_STYLES,
  EXTRA_PROPERTY_GROUPS,
  FACTORY_OPTIONS,
  LOD_ACTIVATION_ANIMATION_OPTIONS,
  RESOURCE_INJECTION_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SLAB_OPTIONS,
  formatPropertyLabel,
  tooltipForExtraProperty,
} from './propertyOptions.js';

export function ExtraPropertiesEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
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
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={`Search ${propertyCount} properties…`} />
        {filter && <button type="button" className="btn-secondary" onClick={() => setFilter('')}>Clear</button>}
      </div>
      {groups.length === 0 && <div className="variant-empty">No property matches “{filter}”.</div>}
      {groups.map(group => (
        <details key={group.title} className="extra-property-group" open={normalizedFilter !== '' || group.title !== 'Other'}>
          <summary><span>{group.title}</span><span className="extra-property-count">{group.keys.length}</span></summary>
          <div className="extra-property-fields">
            {group.title === 'Resources / Recipes' ? <ResourceRecipeEditor value={value} blocks={blocks} onChange={onChange} />
              : group.title === 'Factory / Production' ? <FactoryProductionEditor value={value} blocks={blocks} onChange={onChange} />
              : group.title === 'Chambers' ? <ChambersEditor value={value} blocks={blocks} onChange={onChange} />
              : group.title === 'Controllers' ? <ControllersEditor value={value} blocks={blocks} onChange={onChange} />
              : group.title === 'Collision / Physical' ? <CollisionPhysicalEditor value={value} onChange={onChange} />
              : group.title === 'LOD / Mesh' ? <LodMeshEditor value={value} onChange={onChange} />
              : group.title === 'Logic / Gameplay' ? <LogicGameplayEditor value={value} onChange={onChange} />
              : group.keys.map(key => (
                <Field key={key} label={formatPropertyLabel(key)} tooltip={tooltipForExtraProperty(key)}>
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
        <div><strong>Recipe participation</strong><p>Controls whether StarMade includes this block in recipe and production systems. Disabled blocks keep their data but are ignored by recipes.</p></div>
        <label className="inline-check"><input type="checkbox" checked={inRecipe} onChange={e => updateKey('InRecipe', e.target.checked)} />In recipe</label>
      </div>
      {!inRecipe ? <div className="variant-empty">Recipe fields are inactive because InRecipe is false.</div> : (
        <>
          <div className="resource-two-col">
            <Field label="Resource category" tooltip={tooltipForExtraProperty('BlockResourceType')}>
              <select value={Number(value.BlockResourceType ?? 2)} onChange={e => updateKey('BlockResourceType', +e.target.value)}>
                {RESOURCE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Buy recipe resources" tooltip={tooltipForExtraProperty('RecipeBuyResource')}>
              <ElementListEditor value={normalizeElementList(value.RecipeBuyResource)} blocks={blocks} onChange={items => updateKey('RecipeBuyResource', serializeElementList(items))} addLabel="+ Add buy resource" />
            </Field>
          </div>
          <ResourceListEditor title="Material requirements" help={tooltipForExtraProperty('Consistence')} value={normalizeResourceList(value.Consistence)} blocks={blocks} addLabel="+ Add material" onChange={items => updateKey('Consistence', serializeResourceList(items))} />
          <details className="resource-subsection">
            <summary>Cubatom consistence <span>specialized</span></summary>
            <ResourceListEditor title="Cubatom materials" help={tooltipForExtraProperty('CubatomConsistence')} value={normalizeResourceList(value.CubatomConsistence)} blocks={blocks} addLabel="+ Add cubatom material" onChange={items => updateKey('CubatomConsistence', serializeResourceList(items))} />
          </details>
        </>
      )}
    </div>
  );
}

function ResourceListEditor({ title, help, value, blocks, addLabel, onChange }: { title: string; help: string; value: ResourceEntry[]; blocks: BlockDef[]; addLabel: string; onChange: (value: ResourceEntry[]) => void }) {
  const update = (index: number, patch: Partial<ResourceEntry>) => onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div className="resource-list-editor">
      <div className="resource-list-header"><div><strong>{title}</strong><p>{help}</p></div><button type="button" className="btn-secondary" onClick={() => onChange([...value, { name: blocks[0]?.xmlTypeName ?? '', count: 1 }])}>{addLabel}</button></div>
      {value.length === 0 ? <div className="variant-empty">No resources.</div> : value.map((item, index) => (
        <div key={index} className="resource-row">
          <input className="resource-count" type="number" min={0} value={item.count} onChange={e => update(index, { count: +e.target.value })} />
          <BlockTypeSelect blocks={blocks} value={item.name} onChange={name => update(index, { name })} />
          <button type="button" className="btn-secondary" title="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
    </div>
  );
}

function ElementListEditor({ value, blocks, onChange, addLabel }: { value: string[]; blocks: BlockDef[]; onChange: (value: string[]) => void; addLabel: string }) {
  return (
    <div className="element-list-editor">
      {value.map((item, index) => <div key={index} className="element-row"><BlockTypeSelect blocks={blocks} value={item} onChange={name => onChange(value.map((current, i) => i === index ? name : current))} /><button type="button" className="btn-secondary" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button></div>)}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, blocks[0]?.xmlTypeName ?? ''])}>{addLabel}</button>
    </div>
  );
}

function FactoryProductionEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return <div className="production-editor"><Field label="Produced in" tooltip={tooltipForExtraProperty('ProducedInFactory')}><select value={Number(value.ProducedInFactory ?? 0)} onChange={e => updateKey('ProducedInFactory', +e.target.value)}>{FACTORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Basic resource factory" tooltip={tooltipForExtraProperty('BasicResourceFactory')}><BlockIdSelect blocks={blocks} value={Number(value.BasicResourceFactory ?? 0)} onChange={id => updateKey('BasicResourceFactory', id)} allowNone /></Field><Field label="Bake time" tooltip={tooltipForExtraProperty('FactoryBakeTime')}><input type="number" min={0} step={0.1} value={Number(value.FactoryBakeTime ?? 0)} onChange={e => updateKey('FactoryBakeTime', +e.target.value)} /></Field>{'Factory' in value && <Field label="Factory slot" tooltip={tooltipForExtraProperty('Factory')}><select value={String(value.Factory ?? '')} onChange={e => updateKey('Factory', e.target.value)}><option value="">None</option><option value="INPUT">Input</option><option value="OUTPUT">Output</option></select></Field>}</div>;
}

function ChambersEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return <div className="chambers-editor"><label className="inline-check" title={tooltipForExtraProperty('GeneralChamber')}><input type="checkbox" checked={Boolean(value.GeneralChamber)} onChange={e => updateKey('GeneralChamber', e.target.checked)} />General chamber <span className="field-help" aria-label={tooltipForExtraProperty('GeneralChamber')}>ⓘ</span></label><Field label="Capacity" tooltip={tooltipForExtraProperty('ChamberCapacity')}><input type="number" step={0.01} value={Number(value.ChamberCapacity ?? 0)} onChange={e => updateKey('ChamberCapacity', +e.target.value)} /></Field><Field label="Root chamber" tooltip={tooltipForExtraProperty('ChamberRoot')}><BlockIdSelect blocks={blocks} value={Number(value.ChamberRoot ?? 0)} onChange={id => updateKey('ChamberRoot', id)} allowNone /></Field><Field label="Parent chamber" tooltip={tooltipForExtraProperty('ChamberParent')}><BlockIdSelect blocks={blocks} value={Number(value.ChamberParent ?? 0)} onChange={id => updateKey('ChamberParent', id)} allowNone /></Field><Field label="Upgrades to" tooltip={tooltipForExtraProperty('ChamberUpgradesTo')}><BlockIdSelect blocks={blocks} value={Number(value.ChamberUpgradesTo ?? 0)} onChange={id => updateKey('ChamberUpgradesTo', id)} allowNone /></Field><Field label="Permission" tooltip={tooltipForExtraProperty('ChamberPermission')}><input type="number" value={Number(value.ChamberPermission ?? 0)} onChange={e => updateKey('ChamberPermission', +e.target.value)} /></Field><Field label="Config groups" tooltip={tooltipForExtraProperty('ChamberConfigGroups')}><StringElementListEditor value={normalizeElementList(value.ChamberConfigGroups)} onChange={items => updateKey('ChamberConfigGroups', serializeElementList(items))} addLabel="+ Add group" /></Field></div>;
}

function ControllersEditor({ value, blocks, onChange }: { value: Record<string, unknown>; blocks: BlockDef[]; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return <div className="controllers-editor"><ControllerListEditor title="Controlled by" value={normalizeElementList(value.ControlledBy)} blocks={blocks} onChange={items => updateKey('ControlledBy', serializeElementList(items))} /><ControllerListEditor title="Controls" value={normalizeElementList(value.Controlling)} blocks={blocks} onChange={items => updateKey('Controlling', serializeElementList(items))} /><div className="flags-grid">{(['MainCombinationController', 'SupportCombinationController', 'EffectCombinationController'] as const).map(key => <label key={key} className="flag-toggle" title={tooltipForExtraProperty(key)}><input type="checkbox" checked={Boolean(value[key])} onChange={e => updateKey(key, e.target.checked)} />{formatPropertyLabel(key)} <span className="field-help" aria-label={tooltipForExtraProperty(key)}>ⓘ</span></label>)}</div></div>;
}

function ControllerListEditor({ title, value, blocks, onChange }: { title: string; value: string[]; blocks: BlockDef[]; onChange: (value: string[]) => void }) {
  return <Field label={title} tooltip={title === 'Controlled by' ? tooltipForExtraProperty('ControlledBy') : tooltipForExtraProperty('Controlling')}><ElementListEditor value={value} blocks={blocks} onChange={onChange} addLabel={`+ Add ${title.toLowerCase()}`} /></Field>;
}

function CollisionPhysicalEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  const bools = ['Physical', 'CubeCubeCollision', 'LodCollisionPhysical', 'UseDetailedCollisionForAstronautMode', 'Enterable'] as const;
  return <div className="collision-editor">{bools.map(key => <label key={key} className="inline-check" title={tooltipForExtraProperty(key)}><input type="checkbox" checked={Boolean(value[key])} onChange={e => updateKey(key, e.target.checked)} />{formatPropertyLabel(key)} <span className="field-help" aria-label={tooltipForExtraProperty(key)}>ⓘ</span></label>)}<CollisionShapeEditor label="Default collision" value={value.CollisionDefault} onChange={next => updateKey('CollisionDefault', next)} /><CollisionShapeEditor label="Astronaut collision" value={value.DetailedCollisionForAstronautMode} onChange={next => updateKey('DetailedCollisionForAstronautMode', next)} /></div>;
}

function CollisionShapeEditor({ label, value, onChange }: { label: string; value: unknown; onChange: (value: unknown) => void }) {
  const shape = normalizeCollisionShape(value);
  return <Field label={label} tooltip="Collision shape. Block type uses a named block style and slab thickness; convex hull uses a named mesh resource."><div className="collision-shape-editor"><select value={shape.type} onChange={e => onChange(defaultCollisionShape(e.target.value))}><option value="None">None</option><option value="BlockType">Block style</option><option value="ConvexHull">Convex hull mesh</option></select>{shape.type === 'BlockType' && <><select value={shape.styleId} onChange={e => onChange({ ...shape.raw, '@_type': 'BlockType', StyleId: +e.target.value })}>{BLOCK_STYLES.map(style => <option key={style} value={style}>{blockStyleName(style)}</option>)}</select><select value={shape.slab} onChange={e => onChange({ ...shape.raw, '@_type': 'BlockType', '@_slab': String(+e.target.value) })}>{SLAB_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></>}{shape.type === 'ConvexHull' && <input value={shape.mesh} placeholder="Collision mesh name" onChange={e => onChange({ ...shape.raw, '@_type': 'ConvexHull', Mesh: e.target.value })} />}</div></Field>;
}

function LodMeshEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return <div className="lod-editor"><Field label="Default LOD model" tooltip={tooltipForExtraProperty('LodShape')}><input value={String(value.LodShape ?? '')} onChange={e => updateKey('LodShape', e.target.value)} /></Field><Field label="Active LOD model" tooltip={tooltipForExtraProperty('LodShapeSwitchStyleActive')}><input value={String(value.LodShapeSwitchStyleActive ?? '')} onChange={e => updateKey('LodShapeSwitchStyleActive', e.target.value)} /></Field><Field label="Activation LOD behavior" tooltip={tooltipForExtraProperty('LodActivationAnimationStyle')}><select value={Number(value.LodActivationAnimationStyle ?? 0)} onChange={e => updateKey('LodActivationAnimationStyle', +e.target.value)}>{LOD_ACTIVATION_ANIMATION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field></div>;
}

function LogicGameplayEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const updateKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  const flags = ['SensorInput', 'DrawLogicConnection', 'LogicSignaledByRail', 'LogicBlockButton', 'Beacon'] as const;
  return <div className="logic-editor"><div className="flags-grid">{flags.map(key => <label key={key} className="flag-toggle" title={tooltipForExtraProperty(key)}><input type="checkbox" checked={Boolean(value[key])} onChange={e => updateKey(key, e.target.checked)} />{formatPropertyLabel(key)} <span className="field-help" aria-label={tooltipForExtraProperty(key)}>ⓘ</span></label>)}</div><Field label="Resource injection" tooltip={tooltipForExtraProperty('ResourceInjection')}><select value={Number(value.ResourceInjection ?? 0)} onChange={e => updateKey('ResourceInjection', +e.target.value)}>{RESOURCE_INJECTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Explosion absorption" tooltip={tooltipForExtraProperty('ExplosionAbsorbtion')}><input type="number" step={0.01} value={Number(value.ExplosionAbsorbtion ?? 0)} onChange={e => updateKey('ExplosionAbsorbtion', +e.target.value)} /></Field></div>;
}

function StringElementListEditor({ value, onChange, addLabel }: { value: string[]; onChange: (value: string[]) => void; addLabel: string }) {
  return <div className="element-list-editor">{value.map((item, index) => <div key={index} className="element-row"><input value={item} onChange={e => onChange(value.map((current, i) => i === index ? e.target.value : current))} /><button type="button" className="btn-secondary" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button></div>)}<button type="button" className="btn-secondary" onClick={() => onChange([...value, ''])}>{addLabel}</button></div>;
}

function ExtraValueEditor({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  if (typeof value === 'boolean') return <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />;
  if (typeof value === 'number') return <input type="number" value={value} step={Number.isInteger(value) ? 1 : 0.01} onChange={e => onChange(+e.target.value)} />;
  if (typeof value === 'string') return value.length > 70 || value.includes('\n') ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} /> : <input value={value} onChange={e => onChange(e.target.value)} />;
  if (Array.isArray(value)) return <div className="extra-array-editor">{value.map((item, index) => <div key={index} className="extra-array-item"><span className="extra-array-index">#{index + 1}</span><ExtraValueEditor value={item} onChange={next => onChange(value.map((current, i) => i === index ? next : current))} /></div>)}</div>;
  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return <div className="extra-object-editor">{Object.entries(objectValue).map(([key, nestedValue]) => <div key={key} className="extra-object-row"><label>{formatPropertyLabel(key)}</label><ExtraValueEditor value={nestedValue} onChange={next => onChange({ ...objectValue, [key]: next })} /></div>)}</div>;
  }
  return <input value="" onChange={e => onChange(e.target.value)} />;
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
  return items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map(item => ({ name: String(item['#text'] ?? ''), count: Number(item['@_count'] ?? 1) }));
}

function serializeResourceList(items: ResourceEntry[]): Record<string, unknown> | string {
  const clean = items.filter(item => item.name.trim());
  if (clean.length === 0) return '';
  return { Item: clean.map(item => ({ '#text': item.name.trim(), '@_count': String(Math.max(0, item.count || 0)) })) };
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

function normalizeCollisionShape(value: unknown): { type: string; styleId: number; slab: number; mesh: string; raw: Record<string, unknown> } {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { type: String(raw['@_type'] ?? 'None'), styleId: Number(raw.StyleId ?? 0), slab: Number(raw['@_slab'] ?? 0), mesh: String(raw.Mesh ?? ''), raw };
}

function defaultCollisionShape(type: string): Record<string, unknown> {
  if (type === 'BlockType') return { '@_type': 'BlockType', StyleId: 0, '@_slab': '0' };
  if (type === 'ConvexHull') return { '@_type': 'ConvexHull', Mesh: '' };
  return { '@_type': 'None' };
}
