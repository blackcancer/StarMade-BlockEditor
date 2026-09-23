/** @fileoverview Explicit bridge between immutable Decoder models and the editor's JSON contract. */
import { BlockConfig, BlockDefinition, type BlockDefinitionUpdate } from 'starmade-decoder';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type { BlockDef } from '../api/blocks.js';

/** Editor names mapped to the corresponding persisted Decoder fields. */
const fields = {
  name: 'name', icon: 'icon', textureId: 'textureIds', xmlTypeName: 'xmlTypeName', hp: 'hp', mass: 'mass',
  volume: 'volume', price: 'price', description: 'description', armor: 'armor', isPlacable: 'isPlacable',
  inShop: 'inShop', hasOrientation: 'hasOrientation', canActivate: 'canActivate', isDeprecated: 'isDeprecated',
  blockStyle: 'blockStyle', slab: 'slab', slabIds: 'slabIds', styleIds: 'styleIds', computerReference: 'computerReference',
  lightSource: 'lightSource', lightSourceColor: 'lightSourceColor', transparency: 'transparent', logicBlock: 'logicBlock',
  individualSides: 'individualSides', sideTexturesPointToOrientation: 'sideTexturesPointToOrientation',
  hasActivationTexture: 'hasActivationTexture', extendedTexture4x4: 'extendedTexture',
  onlyDrawnInBuildMode: 'drawOnlyInBuildMode', lodShapeFromFar: 'lodShapeStyle', animated: 'animated',
} as const;

/** XML fields already represented by the editor's first-class properties. */
const coreXml = new Set(['@_type', '@_name', '@_icon', '@_textureId', 'Hitpoints', 'Mass', 'Volume', 'Price',
  'Description', 'ArmorValue', 'Placable', 'InShop', 'Orientation', 'CanActivate', 'Deprecated', 'BlockStyle',
  'Slab', 'SlabIds', 'StyleIds', 'EffectArmor', 'BlockComputerReference', 'LightSource', 'LightSourceColor',
  'Transparency', 'Door', 'LogicBlock', 'IndividualSides', 'SideTexturesPointToOrientation', 'HasActivationTexture',
  'ExtendedTexture4x4', 'OnlyDrawnInBuildMode', 'LodShapeFromFar', 'Animated']);

/** Typed advanced scalar tags; unknown extension values retain lexical strings. */
const advancedBooleans = new Set(['InRecipe', 'Physical', 'CubeCubeCollision', 'UseDetailedCollisionForAstronautMode',
  'Beacon', 'Enterable', 'SensorInput', 'SystemBlock', 'MainCombinationController', 'SupportCombinationController',
  'EffectCombinationController', 'GeneralChamber', 'LodCollisionPhysical', 'DrawLogicConnection', 'LogicSignaledByRail', 'LogicBlockButton']);
const advancedNumbers = new Set(['OldHitpoints', 'LowHpSetting', 'StructureHPContribution', 'ExplosionAbsorbtion',
  'BlockResourceType', 'BasicResourceFactory', 'ProducedInFactory', 'FactoryBakeTime', 'SourceReference',
  'ChamberRoot', 'ChamberParent', 'ChamberUpgradesTo', 'ChamberAppliesTo', 'ChamberCapacity', 'ChamberPermission',
  'ReactorHp', 'ReactorGeneralIconIndex', 'LodActivationAnimationStyle', 'ResourceInjection']);
const booleans = new Set(['isPlacable', 'inShop', 'hasOrientation', 'canActivate', 'isDeprecated', 'lightSource',
  'transparency', 'door', 'logicBlock', 'sideTexturesPointToOrientation', 'hasActivationTexture',
  'extendedTexture4x4', 'onlyDrawnInBuildMode', 'animated']);
const integers = new Set(['icon', 'hp', 'price', 'blockStyle', 'slab', 'computerReference', 'individualSides', 'lodShapeFromFar']);
const limits: Record<string, number> = { icon: 32767, hp: 2147483647, price: Number.MAX_SAFE_INTEGER,
  blockStyle: 6, slab: 3, computerReference: 4094, individualSides: 6, lodShapeFromFar: 2 };
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false, isArray: name => name === 'Block' });
const builder = new XMLBuilder({ ignoreAttributes: false, format: false });
/** XML 1.0 forbids control characters and lone UTF-16 surrogates. */
const invalidXmlText = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u;

/** Compares detached JSON values without coercing lexical XML strings. */
function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
/** Checks a non-array record received over HTTP. */
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
/** Reads a source-preserving public Decoder export, never private WeakMap internals. */
function xmlNode(block: BlockDefinition): Record<string, unknown> {
  return parser.parse(BlockConfig.fromBlocks([block]).toXml()).Config.Element.General.Custom.Block[0];
}

/** Projects unknown fields and advanced XML names expected by existing property panels. */
export function collectExtraProperties(node: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(node).filter(([key]) => !coreXml.has(key) && key !== '#text'));
}
/** Reads armor fields from their XML record, ignoring malformed values. */
export function parseEffectArmor(value: unknown): Record<string, number> {
  if (!record(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const numeric = Number.parseFloat(String(record(entry) ? entry['#text'] : entry));
    return Number.isFinite(numeric) ? [[key, numeric]] : [];
  }));
}
/** Omits absent armor records rather than inventing serialized values. */
export function serializeEffectArmor(value: Record<string, number>): Record<string, number> | undefined {
  const result = Object.fromEntries(Object.entries(value).filter(([, numeric]) => Number.isFinite(numeric)));
  return Object.keys(result).length === 0 ? undefined : result;
}

/** Creates detached JSON while keeping authoritative immutable instances on the server. */
export function toBlockDto(block: BlockDefinition, isCustom: boolean, revision: string): BlockDef {
  const node = xmlNode(block);
  const extraProperties = collectExtraProperties(node);
  for (const [key, value] of Object.entries(extraProperties)) {
    if (advancedBooleans.has(key) && typeof value === 'string') extraProperties[key] = value.toLowerCase() === 'true';
    if (advancedNumbers.has(key) && typeof value === 'string') extraProperties[key] = Number(value);
  }
  const core = Object.fromEntries(Object.entries(fields).map(([editor, decoder]) => [editor, block[decoder]])) as Pick<BlockDef, keyof typeof fields>;
  return structuredClone({ ...core, id: block.id, door: block.metadata.door, effectArmor: parseEffectArmor(node.EffectArmor),
    extraProperties, isCustom, revision }) as BlockDef;
}

/** Rejects malformed XML-shaped input before the XML builder or Decoder sees it. */
function validateXml(value: unknown, depth = 0): void {
  if (depth > 24) throw new TypeError('XML property nesting is too deep');
  if (typeof value === 'string' && invalidXmlText.test(value)) throw new TypeError('Invalid XML text');
  if (typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (value.length > 4096) throw new TypeError('XML property array is too large');
    value.forEach(item => validateXml(item, depth + 1)); return;
  }
  if (!record(value)) throw new TypeError('Invalid XML property value');
  for (const [key, child] of Object.entries(value)) {
    if (key !== '#text' && !/^(?:@_)?[A-Za-z_][A-Za-z0-9_.:-]*$/.test(key)) throw new TypeError('Invalid XML property name');
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new TypeError('Reserved XML property name');
    validateXml(child, depth + 1);
  }
}

/** Validates editor fields; omitted and unchanged legacy fields are not reinterpreted. */
function validateField(key: string, value: unknown): void {
  if (booleans.has(key)) { if (typeof value !== 'boolean') throw new TypeError(`${key} must be boolean`); return; }
  if (['name', 'description', 'xmlTypeName', 'revision'].includes(key)) {
    if (typeof value !== 'string' || (key !== 'description' && value.trim() === '')) throw new TypeError(`${key} must be text`);
    if (invalidXmlText.test(value)) throw new TypeError('Invalid XML text');
    return;
  }
  if (key === 'extraProperties') {
    if (!record(value)) throw new TypeError('extraProperties must be an object');
    validateXml(value);
    for (const [tag, entry] of Object.entries(value)) {
      if (coreXml.has(tag)) throw new TypeError(`Use the named field for ${tag}`);
      const scalar = record(entry) ? entry['#text'] : entry;
      if (advancedBooleans.has(tag) && ![true, false, 'true', 'false'].includes(scalar as boolean)) throw new TypeError(`${tag} must be boolean`);
      if (advancedNumbers.has(tag) && (typeof scalar !== 'number' && typeof scalar !== 'string' || String(scalar).trim() === '' || !Number.isFinite(Number(scalar)))) throw new TypeError(`${tag} must be numeric`);
    }
    return;
  }
  if (key === 'effectArmor') {
    if (!record(value) || Object.values(value).some(entry => typeof entry !== 'number' || !Number.isFinite(entry))) throw new TypeError('effectArmor must contain finite numbers');
    validateXml(value); return;
  }
  if (['textureId', 'slabIds', 'styleIds', 'lightSourceColor'].includes(key)) {
    if (!Array.isArray(value) || value.length > 4096) throw new TypeError(`${key} must be a bounded array`);
    const color = key === 'lightSourceColor';
    if (color && value.length !== 4 || key === 'textureId' && ![1, 3, 6].includes(value.length)) throw new TypeError(`Invalid ${key} length`);
    if (value.some(entry => typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0 || !color && (!Number.isInteger(entry) || entry > (key === 'textureId' ? 2047 : 4094)))) throw new TypeError(`Invalid ${key} value`);
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || integers.has(key) && (!Number.isSafeInteger(value) || value > limits[key])) throw new TypeError(`Invalid ${key} value`);
  if (key === 'individualSides' && ![1, 3, 6].includes(value)) throw new TypeError('Invalid face grouping');
}

/** Retains unknown nested attributes when an advanced editor rebuilds a known subtree. */
function mergeXml(previous: unknown, current: unknown): unknown {
  if (current === '') return current;
  if (Array.isArray(current)) {
    const old = Array.isArray(previous) ? previous : [previous];
    return current.map((entry, index) => mergeXml(old[index], entry));
  }
  if (record(current)) {
    const result = record(previous) ? { ...previous } : {};
    for (const [key, entry] of Object.entries(current)) result[key] = mergeXml(result[key], entry);
    return result;
  }
  return record(previous) ? { ...previous, '#text': current } : current;
}

/** Applies validated edits to an original model and keeps its unmodified XML source details. */
export function updateDefinition(original: BlockDefinition, input: unknown): BlockDefinition {
  if (!record(input)) throw new TypeError('Block patch must be an object');
  const before = toBlockDto(original, false, 'original');
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'id') { if (value !== original.id) throw new TypeError('Block id cannot change'); continue; }
    if (key === 'isCustom' || key === 'revision') {
      if (typeof value !== (key === 'isCustom' ? 'boolean' : 'string')) throw new TypeError(`Invalid ${key}`);
      continue;
    }
    if (!Object.hasOwn(fields, key) && !['door', 'effectArmor', 'extraProperties'].includes(key)) throw new TypeError(`Unknown block field: ${key}`);
    if (same(value, before[key as keyof BlockDef])) continue;
    validateField(key, value);
    changes[key] = value;
  }
  const core = Object.fromEntries(Object.entries(changes).filter(([key]) => Object.hasOwn(fields, key))
    .map(([key, value]) => [fields[key as keyof typeof fields], value]));
  if ('door' in changes) core.metadata = { door: changes.door };
  const updated = original.with(core as BlockDefinitionUpdate);
  if (!('extraProperties' in changes) && !('effectArmor' in changes)) return updated;
  const node = xmlNode(updated);
  if ('effectArmor' in changes) {
    const previousArmor = record(node.EffectArmor) ? node.EffectArmor : {};
    const retained = Object.fromEntries(Object.entries(previousArmor).filter(([key]) => !Object.hasOwn(before.effectArmor, key)));
    const edited = Object.fromEntries(Object.entries(changes.effectArmor as Record<string, number>)
      .map(([key, value]) => [key, mergeXml(previousArmor[key], value)]));
    const armor = { ...retained, ...edited };
    node.EffectArmor = Object.keys(armor).length === 0 ? undefined : armor;
  }
  if ('extraProperties' in changes) {
    const extra = changes.extraProperties as Record<string, unknown>;
    for (const key of new Set([...Object.keys(before.extraProperties), ...Object.keys(extra)])) {
      if (!Object.hasOwn(extra, key)) delete node[key];
      else if (!same(extra[key], before.extraProperties[key])) node[key] = mergeXml(node[key], extra[key]);
    }
  }
  const serialized = builder.build({ Config: { Element: { General: { Custom: { Block: node } } } } });
  return BlockConfig.fromXml(serialized, new Map([[updated.xmlTypeName, updated.id]])).getById(updated.id)!;
}
