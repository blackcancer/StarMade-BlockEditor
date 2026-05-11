/**
 * @fileoverview Shared display options, constants and source-informed tooltips
 * for the block properties panel.
 *
 * All option lists, labels and tooltip texts in this file are derived from
 * StarMade source code analysis — primarily:
 *   - `ElementInformation.java`  (block fields, light, armor, recipe, chambers)
 *   - `ElemType.java`            (XML type enum)
 *   - `BlockConfig.xml` schema   (extra property keys)
 *   - Factory/Reactor/Chamber systems from the StarMade-Open source reference
 *
 * Keeping this data separate from the React components makes it easy to update
 * tooltip accuracy as the StarMade source evolves without touching UI logic.
 *
 * @module propertyOptions
 * @author InitSysRev
 * @version 1.0.0
 */

// ── Shape / geometry ─────────────────────────────────────────────────────────

/**
 * All valid BlockStyle values in BlockConfig.xml.
 *
 * Source: `ElementInformation.BlockStyle` field + `starmade_gl.js` geometry map.
 *  0 = Cube    (most blocks, default)
 *  1 = Wedge   (triangular prism — roofs, ramps)
 *  2 = Corner  (corner piece of a wedge)
 *  3 = Cross   (two crossed planes — flora, vegetation)
 *  4 = Tetra   (tetrahedron — decorative 4-vertex shape)
 *  5 = Penta   (pentagon prism — "hepta" variant)
 *  6 = Hepta   (treated as cube in rendering — rare)
 */
export const BLOCK_STYLES = [0, 1, 2, 3, 4, 5, 6];

// ── IndividualSides modes ─────────────────────────────────────────────────────

/**
 * Options for the `IndividualSides` field in BlockConfig.xml.
 *
 * Controls how the six textureId entries are interpreted by the rendering engine.
 * Source: `ElementInformation.IndividualSides` + cube shader UV lookup.
 *
 *  1 — all six faces share textureId[0]
 *  3 — grouped: front/back = textureId[0], top/bottom = textureId[1],
 *                right/left = textureId[2]
 *  6 — each face has its own tile:
 *       [0]=front, [1]=back, [2]=top, [3]=bottom, [4]=right, [5]=left
 */
export const IND_SIDES_OPTIONS = [
  { value: 1, label: 'All faces same tile' },
  { value: 3, label: 'Grouped faces: front/back · top/bottom · sides' },
  { value: 6, label: 'Each face independent' },
];

// ── Light source colour presets ───────────────────────────────────────────────

/**
 * Common light colour presets shown in the colour picker palette row.
 *
 * Colours are CSS hex strings and map to LightSourceColor RGB channels.
 * Source: typical StarMade light-source blocks (e.g. light panels, beacons).
 */
export const LIGHT_PRESETS = [
  '#ffffff', // Pure white — standard light panel
  '#60b8ff', // Cool blue  — engine glow, thruster
  '#34d399', // Green      — power core, reactor indicator
  '#fbbf24', // Amber      — warning light, cargo
  '#f87171', // Red        — alarm, hazard
  '#a78bfa', // Purple     — exotic/purple light source
  '#22d3ee', // Cyan       — shield/electric block
  '#f97316', // Orange     — fire/heat indicator
];

// ── Slab geometry ─────────────────────────────────────────────────────────────

/**
 * Options for the `Slab` field in BlockConfig.xml.
 *
 * Controls vertical thickness of the block in the engine's slab system.
 * Source: `ElementInformation.Slab` + geometry rendering in StarMade-Open.
 *
 *  0 = Full block (no slab)
 *  1 = 3/4 thickness
 *  2 = 1/2 thickness
 *  3 = 1/4 thickness
 *
 * Slabs reduce depth along the Z axis in the preview (not Y — vertical slab convention).
 */
export const SLAB_OPTIONS = [
  { value: 0, label: 'Full block' },
  { value: 1, label: '3/4 slab' },
  { value: 2, label: '1/2 slab' },
  { value: 3, label: '1/4 slab' },
];

// ── Effect armour ─────────────────────────────────────────────────────────────

/**
 * Per-damage-type armour modifier keys exposed via the `EffectArmor` XML node.
 *
 * Source: `ElementInformation.EffectArmor` sub-field names, StarMade-Open.
 *  Heat    — thermal / fire damage resistance
 *  Kinetic — kinetic / projectile damage resistance
 *  EM      — electromagnetic / EMP damage resistance
 */
export const EFFECT_ARMOR_TYPES = ['Heat', 'Kinetic', 'EM'];

// ── Economy / resource ────────────────────────────────────────────────────────

/**
 * Options for the `BlockResourceType` field.
 *
 * Maps the economy category of the block for shop/recipe systems.
 * Source: `ElementInformation.BlockResourceType` enum.
 *
 *  0 = Ore              — raw mined material
 *  1 = Plant            — flora / organic resource
 *  2 = Basic resource   — processed basic material (default)
 *  3 = Cubatom-splittable — can be split via cubatom refinery
 *  4 = Manufactory      — produced by manufactory systems
 *  5 = Advanced         — advanced crafted component
 *  6 = Capsule          — capsule-type product
 */
export const RESOURCE_TYPE_OPTIONS = [
  { value: 0, label: 'Ore' },
  { value: 1, label: 'Plant' },
  { value: 2, label: 'Basic resource' },
  { value: 3, label: 'Cubatom-splittable' },
  { value: 4, label: 'Manufactory' },
  { value: 5, label: 'Advanced' },
  { value: 6, label: 'Capsule' },
];

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Options for the `ProducedInFactory` field.
 *
 * Identifies which factory tier can craft this block.
 * Source: `ElementInformation.ProducedInFactory` + factory block implementations.
 *
 *  0 = None              — cannot be produced in a factory
 *  1 = Capsule refinery  — produced in the basic capsule refinery
 *  2 = Micro assembler   — produced in the micro assembler
 *  3 = Component factory — produced in the component factory
 *  4 = Block assembler   — produced in the block assembler
 *  5 = Chemical factory  — produced in the chemical factory
 */
export const FACTORY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Capsule refinery' },
  { value: 2, label: 'Micro assembler' },
  { value: 3, label: 'Component factory' },
  { value: 4, label: 'Block assembler' },
  { value: 5, label: 'Chemical factory' },
];

// ── Resource injection ────────────────────────────────────────────────────────

/**
 * Options for the `ResourceInjection` field.
 *
 * Controls how the block injects resources into the world/terrain generation.
 * Source: `ElementInformation.ResourceInjection` enum.
 *
 *  0 = Off                  — block does not inject resources
 *  1 = Ore / terrain resource — injects as a terrain/ore resource
 *  2 = Flora resource        — injects as a flora/plant resource
 */
export const RESOURCE_INJECTION_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Ore / terrain resource' },
  { value: 2, label: 'Flora resource' },
];

// ── LOD ───────────────────────────────────────────────────────────────────────

/**
 * Options for the `LodActivationAnimationStyle` field.
 *
 * Determines how the LOD (Level of Detail) mesh transitions when the block
 * switches between active and inactive states.
 * Source: `ElementInformation.LodActivationAnimationStyle`.
 *
 *  0 = No active LOD switch           — LOD stays the same regardless of state
 *  1 = Use active LOD shape while active — switches to the active-state LOD mesh
 */
export const LOD_ACTIVATION_ANIMATION_OPTIONS = [
  { value: 0, label: 'No active LOD switch' },
  { value: 1, label: 'Use active LOD shape while active' },
];

// ── Extra property groups ─────────────────────────────────────────────────────

/**
 * Ordered list of named property groups for the advanced editor.
 *
 * Each group contains the XML keys (from BlockConfig.xml `<Block>` nodes) that
 * belong to a logical subsystem. Keys that appear in a group are rendered with
 * a custom sub-editor; keys not listed in any group fall into the `Other` bucket
 * and use a generic value editor.
 *
 * Source: BlockConfig.xml schema + `ElementInformation.java` field names.
 */
export const EXTRA_PROPERTY_GROUPS = [
  {
    title: 'Resources / Recipes',
    keys: ['Consistence', 'CubatomConsistence', 'InRecipe', 'RecipeBuyResource', 'BlockResourceType'],
  },
  {
    title: 'Factory / Production',
    keys: ['ProducedInFactory', 'BasicResourceFactory', 'FactoryBakeTime', 'Factory'],
  },
  {
    title: 'Chambers',
    keys: [
      'GeneralChamber', 'ChamberCapacity', 'ChamberRoot', 'ChamberParent',
      'ChamberUpgradesTo', 'ChamberPermission', 'ChamberAppliesTo',
      'ChamberPrerequisites', 'ChamberMutuallyExclusive', 'ChamberChildren',
      'ChamberConfigGroups',
    ],
  },
  {
    title: 'Controllers',
    keys: [
      'ControlledBy', 'Controlling',
      'MainCombinationController', 'SupportCombinationController', 'EffectCombinationController',
    ],
  },
  {
    title: 'Collision / Physical',
    keys: [
      'Physical', 'CollisionDefault', 'CubeCubeCollision',
      'UseDetailedCollisionForAstronautMode', 'DetailedCollisionForAstronautMode',
      'LodCollisionPhysical', 'Enterable',
    ],
  },
  {
    title: 'LOD / Mesh',
    keys: ['LodShape', 'LodShapeSwitchStyleActive', 'LodActivationAnimationStyle'],
  },
  {
    title: 'Logic / Gameplay',
    keys: [
      'SensorInput', 'DrawLogicConnection', 'LogicSignaledByRail',
      'LogicBlockButton', 'Beacon', 'ResourceInjection', 'ExplosionAbsorbtion',
    ],
  },
  {
    title: 'Reactor / Structure',
    keys: [
      'StructureHPContribution', 'SourceReference', 'ReactorHp',
      'ReactorGeneralIconIndex', 'LowHpSetting', 'OldHitpoints', 'SystemBlock',
    ],
  },
  {
    title: 'Inventory / Metadata',
    keys: ['InventoryGroup', 'FullName', 'WildcardIds'],
  },
];

// ── Per-field tooltip texts ───────────────────────────────────────────────────

/**
 * Tooltip text for each known extra BlockConfig property.
 *
 * Derived from `ElementInformation.java`, `ElemType.java`, reactor/chamber
 * system code and BlockConfig.xml schema analysis (StarMade-Open reference).
 *
 * Tooltips for unknown keys are generated dynamically by `tooltipForExtraProperty`.
 */
const EXTRA_TOOLTIPS: Record<string, string> = {
  // ── Resources / Recipes ────────────────────────────────────────────────────
  Consistence:
    'Crafting/material requirements. StarMade reads Item entries with a count and a block/resource type.',
  CubatomConsistence:
    'Special material list used by cubatom/capsule splitting logic. Usually empty for regular blocks.',
  InRecipe:
    'Controls whether StarMade includes this block in recipe/production systems.',
  RecipeBuyResource:
    'Additional resources consumed by buy/craft recipes.',
  BlockResourceType:
    'Economy/resource category used to group ores, plants, basic resources, manufactory outputs, advanced parts and capsules.',

  // ── Factory / Production ────────────────────────────────────────────────────
  ProducedInFactory:
    'Factory tier/category that can produce this block.',
  BasicResourceFactory:
    'Factory/resource block associated with basic-resource production.',
  FactoryBakeTime:
    'Production time (in game ticks) used by the factory pipeline.',
  Factory:
    'Marks a factory slot role for this block — typically INPUT (resource slot) or OUTPUT (product slot).',

  // ── Chambers ────────────────────────────────────────────────────────────────
  GeneralChamber:
    'Marks a reactor chamber as a general/root-capable chamber in the reactor system.',
  ChamberCapacity:
    'Capacity contribution provided to the reactor by this chamber.',
  ChamberRoot:
    'Root chamber this chamber belongs to in the upgrade tree.',
  ChamberParent:
    'Parent chamber required before this one can be installed.',
  ChamberUpgradesTo:
    'Chamber that becomes available once this chamber is installed.',
  ChamberPermission:
    'Permission/access level flag for the chamber system.',
  ChamberAppliesTo:
    'Block types or chamber targets this chamber effect applies to.',
  ChamberPrerequisites:
    'List of chambers that must be present before this one is available.',
  ChamberMutuallyExclusive:
    'Chambers that cannot be combined/installed alongside this one.',
  ChamberChildren:
    'Child chambers in the upgrade tree branching from this chamber.',
  ChamberConfigGroups:
    'Named configuration groups used by the reactor UI to group related chambers.',

  // ── Controllers ─────────────────────────────────────────────────────────────
  ControlledBy:
    'XML type names of controller blocks that can control this block.',
  Controlling:
    'XML type names of blocks this controller block can control.',
  MainCombinationController:
    'Marks this block as the primary controller in a controller/support/effect combination system.',
  SupportCombinationController:
    'Marks this block as a support controller in the combination system.',
  EffectCombinationController:
    'Marks this block as an effect (output) controller in the combination system.',

  // ── Collision / Physical ────────────────────────────────────────────────────
  Physical:
    'Whether the block participates as a physical/collidable object in the physics engine.',
  CollisionDefault:
    'Default collision shape. Supports None (no collision), a block-style shape with slab thickness, or a named convex hull mesh.',
  CubeCubeCollision:
    'Uses simple axis-aligned cube-vs-cube collision instead of a detailed mesh.',
  UseDetailedCollisionForAstronautMode:
    'Enables the detailed collision shape when the player is in astronaut (walking) mode.',
  DetailedCollisionForAstronautMode:
    'The detailed collision shape used in astronaut mode; typically a convex hull mesh for non-cube block shapes.',
  LodCollisionPhysical:
    'Whether LOD-reduced geometry retains physical/collision properties.',
  Enterable:
    'Whether an entity or player can pass into or occupy the block volume.',

  // ── LOD / Mesh ──────────────────────────────────────────────────────────────
  LodShape:
    'Low-detail mesh resource name used when LOD rendering activates at distance.',
  LodShapeSwitchStyleActive:
    'Active-state LOD mesh; enabled when the block is active and LodActivationAnimationStyle = 1.',
  LodActivationAnimationStyle:
    'LOD activation transition mode. 0 = no switch; 1 = swap to active LOD mesh while block is active.',

  // ── Logic / Gameplay ────────────────────────────────────────────────────────
  SensorInput:
    'Allows this block to act as a sensor/input node in the logic network.',
  DrawLogicConnection:
    'Draws visible wire/connection lines between this block and connected logic blocks.',
  LogicSignaledByRail:
    'Allows rail/activator rail signals to drive the logic state of this block.',
  LogicBlockButton:
    'Treats this block as a momentary button input in the logic system.',
  Beacon:
    'Marks this block as a beacon — visible on scanners and navigation overlays.',
  ResourceInjection:
    'Resource injection mode for world generation. Off = no injection; 1 = ore/terrain; 2 = flora.',
  ExplosionAbsorbtion:
    'Explosion energy absorption factor used by the damage system (0.0–1.0+).',

  // ── Reactor / Structure ──────────────────────────────────────────────────────
  StructureHPContribution:
    'Additional structure hit points contributed by this block to the ship/station hull.',
  SourceReference:
    'References another block or system entry as the source/parent of this block.',
  ReactorHp:
    'Hit point contribution or capacity this block provides to the reactor system.',
  ReactorGeneralIconIndex:
    'Icon index used by the reactor/chamber configuration UI.',
  LowHpSetting:
    'Behavioral threshold or setting applied when the structure drops below a critical HP level.',
  OldHitpoints:
    'Legacy hit point value retained for save-game compatibility and migration.',
  SystemBlock:
    'Marks this block as part of a ship/station system group (weapons, shields, thrusters, etc.).',

  // ── Inventory / Metadata ─────────────────────────────────────────────────────
  InventoryGroup:
    'Category/group used to sort and display the block in the build/inventory menu.',
  FullName:
    'Long-form display name shown in some game UI contexts where brevity is less important.',
  WildcardIds:
    'Alternative block IDs or XML type names accepted as equivalent by certain game systems.',
};

/**
 * Return the tooltip text for a named extra BlockConfig property.
 *
 * Returns the source-informed description from EXTRA_TOOLTIPS if the key is
 * known, or a generic fallback message that still provides useful context.
 *
 * @param {string} key BlockConfig XML node/attribute key (e.g. `"Consistence"`).
 * @returns {string} Human-readable tooltip text.
 */
export function tooltipForExtraProperty(key: string): string {
  return (
    EXTRA_TOOLTIPS[key] ??
    `${formatPropertyLabel(key)} from BlockConfig.xml. This field is preserved and saved back for StarMade compatibility.`
  );
}

/**
 * Convert a raw BlockConfig XML key into a readable UI label.
 *
 * Strips attribute prefixes (`@_`, `#`), inserts spaces before camelCase
 * boundaries, and replaces underscores with spaces.
 *
 * Examples:
 *   `"IndividualSides"` → `"Individual Sides"`
 *   `"@_type"`          → `"Type"`
 *   `"#text"`           → `"Value"`
 *
 * @param {string} key Raw XML key.
 * @returns {string} Human-readable label.
 */
export function formatPropertyLabel(key: string): string {
  const cleaned = key.replace(/^@_/, '').replace(/^#/, '');
  return cleaned
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → words
    .replace(/_/g, ' ')                       // snake_case → words
    .replace(/^text$/i, 'Value')              // #text → Value
    .replace(/^count$/i, 'Count');            // @_count → Count
}


// ── Localised option list factories ──────────────────────────────────────────
// These functions return option arrays whose labels come from the active locale.
// Import `Translations` type from i18n to keep them decoupled from the store.

import type { Translations } from '../../i18n/en.js';

/** Localised IndividualSides options. */
export function getIndSidesOptions(t: Translations) {
  return [
    { value: 1, label: t.options.indSides.allSame },
    { value: 3, label: t.options.indSides.grouped },
    { value: 6, label: t.options.indSides.independent },
  ];
}

/** Localised Slab options. */
export function getSlabOptions(t: Translations) {
  return [
    { value: 0, label: t.options.slab.full },
    { value: 1, label: t.options.slab.s34 },
    { value: 2, label: t.options.slab.s12 },
    { value: 3, label: t.options.slab.s14 },
  ];
}

/** Localised BlockResourceType options. */
export function getResourceTypeOptions(t: Translations) {
  return [
    { value: 0, label: t.options.resourceType.ore },
    { value: 1, label: t.options.resourceType.plant },
    { value: 2, label: t.options.resourceType.basicResource },
    { value: 3, label: t.options.resourceType.cubatom },
    { value: 4, label: t.options.resourceType.manufactory },
    { value: 5, label: t.options.resourceType.advanced },
    { value: 6, label: t.options.resourceType.capsule },
  ];
}

/** Localised ProducedInFactory options. */
export function getFactoryOptions(t: Translations) {
  return [
    { value: 0, label: t.options.factory.none },
    { value: 1, label: t.options.factory.capsuleRefinery },
    { value: 2, label: t.options.factory.microAssembler },
    { value: 3, label: t.options.factory.componentFactory },
    { value: 4, label: t.options.factory.blockAssembler },
    { value: 5, label: t.options.factory.chemicalFactory },
  ];
}

/** Localised ResourceInjection options. */
export function getResourceInjectionOptions(t: Translations) {
  return [
    { value: 0, label: t.options.resourceInjection.off },
    { value: 1, label: t.options.resourceInjection.ore },
    { value: 2, label: t.options.resourceInjection.flora },
  ];
}

/** Localised LodActivationAnimationStyle options. */
export function getLodAnimationOptions(t: Translations) {
  return [
    { value: 0, label: t.options.lodAnimation.noSwitch },
    { value: 1, label: t.options.lodAnimation.useActive },
  ];
}

/** Localised tooltip for an extra BlockConfig property key. */
export function tooltipForExtraPropertyL10n(key: string, t: Translations): string {
  const tips = t.extraTooltip as Record<string, unknown>;
  const val = tips[key];
  if (typeof val === 'string') return val;
  return t.extraTooltip._fallback(key);
}

/** Localised block style name. */
export function getBlockStyleName(blockStyle: number, t: Translations): string {
  switch (blockStyle) {
    case 0: return t.blockStyle.cube;
    case 1: return t.blockStyle.wedge;
    case 2: return t.blockStyle.corner;
    case 3: return t.blockStyle.cross;
    case 4: return t.blockStyle.tetra;
    case 5: return t.blockStyle.penta;
    case 6: return t.blockStyle.hepta;
    default: return t.blockStyle.style(blockStyle);
  }
}

/**
 * Localise an EXTRA_PROPERTY_GROUPS group title.
 * Group titles are English keys; the translation maps them by index order.
 */
const GROUP_TITLE_KEYS = [
  'Resources / Recipes',
  'Factory / Production',
  'Chambers',
  'Controllers',
  'Collision / Physical',
  'LOD / Mesh',
  'Logic / Gameplay',
  'Reactor / Structure',
  'Inventory / Metadata',
] as const;

type GroupTitleKey = typeof GROUP_TITLE_KEYS[number];

// Map each English group title to a key path in the translations object
const GROUP_TITLE_MAP: Record<GroupTitleKey, (t: Translations) => string> = {
  'Resources / Recipes':  (t) => t.section.extra,  // use extra as fallback; real map below
  'Factory / Production': (t) => t.section.extra,
  'Chambers':             (t) => t.section.extra,
  'Controllers':          (t) => t.section.extra,
  'Collision / Physical': (t) => t.section.extra,
  'LOD / Mesh':           (t) => t.section.extra,
  'Logic / Gameplay':     (t) => t.section.extra,
  'Reactor / Structure':  (t) => t.section.extra,
  'Inventory / Metadata': (t) => t.section.extra,
};

/** Translate a property group title (passthrough for English). */
export function localiseGroupTitle(title: string, t: Translations): string {
  // The group titles don't change structurally; only a subset need translation.
  // Using a simple inline map avoids adding many new keys to the locale files.
  const map: Record<string, (t: Translations) => string> = {
    'Resources / Recipes':  (t) => t.advanced.materialReqs.replace(' requirements', '') + ' / Recettes',
    'Factory / Production': (t) => t.advanced.producedIn.split(' ')[0] + ' / Production',
    'Chambers':             () => 'Chambers',
    'Controllers':          () => 'Controllers',
    'Collision / Physical': () => 'Collision / Physical',
    'LOD / Mesh':           () => 'LOD / Mesh',
    'Logic / Gameplay':     () => 'Logic / Gameplay',
    'Reactor / Structure':  () => 'Reactor / Structure',
    'Inventory / Metadata': () => 'Inventory / Metadata',
    'Other':                () => 'Other',
  };
  return map[title]?.(t) ?? title;
}
