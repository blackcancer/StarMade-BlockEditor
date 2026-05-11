/**
 * @fileoverview Block definitions API router.
 *
 * Provides REST endpoints for reading and writing StarMade block definitions.
 * Block data is sourced from two XML configuration files:
 *
 *  - `data/config/BlockConfig.xml`               — vanilla block definitions (read-only)
 *  - `customBlockConfig/BlockConfigImport.xml`    — custom/modified blocks (read-write)
 *
 * Block IDs are resolved by cross-referencing the symbolic XML type name
 * (e.g. `"GREY_HULL"`) with `data/config/BlockTypes.properties` which maps
 * each type name to its numeric block ID.
 *
 * ## Write policy
 * Only blocks in `customBlockConfig/BlockConfigImport.xml` can be modified or
 * deleted. When a vanilla block is saved it is *promoted* to the custom file
 * (marked `isCustom: true`) rather than modifying the vanilla XML directly.
 * Vanilla blocks cannot be deleted — they can only be deprecated.
 *
 * ## Caching
 * Parsed block data is cached in memory keyed by the mtime of the two XML files
 * and the `BlockTypes.properties` file. Any write operation clears the cache.
 *
 * ## XML format
 * fast-xml-parser is used for both reading and writing. Key conventions:
 *  - Attributes use the `@_` prefix (e.g. `@_type`, `@_name`, `@_icon`).
 *  - Boolean text nodes are parsed as JS booleans.
 *  - The `Block` element is always treated as an array.
 *
 * @module api/blocks
 * @author InitSysRev
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { resolveStarmadeRoot } from '../utils/path.js';

// =============================================================================
// BlockDef interface
// =============================================================================

/**
 * Complete block definition as returned by the API and stored in the block store.
 *
 * All fields map directly to BlockConfig.xml attributes/elements.
 * Source: `ElementInformation.java` + `BlockConfig.xml` schema.
 */
export interface BlockDef {
  /** Numeric block ID from BlockTypes.properties. Unique per block. */
  id:               number;
  /** Display name shown in StarMade UI. From the `@_name` XML attribute. */
  name:             string;
  /** Build-menu icon ID. Maps to a slot in the build-icons sheet files. */
  icon:             number;
  /**
   * Texture tile IDs for each face in order: [front, back, top, bottom, right, left].
   * The length may be 1 (all-same), 3 (grouped), or 6 (independent) depending on
   * `individualSides`. Maps to the `@_textureId` attribute (comma-separated).
   */
  textureId:        number[];
  /** Raw XML type name from `@_type` (e.g. `"GREY_HULL"`). Used as the primary key in some systems. */
  xmlTypeName:      string;
  /** Block hit points — durability / damage threshold. From `<Hitpoints>`. */
  hp:               number;
  /** Mass contribution per placed block — affects ship/station inertia. From `<Mass>`. */
  mass:             number;
  /** Volume value used by economy/balancing systems. From `<Volume>`. */
  volume:           number;
  /** Base shop price when the block is available for trade. From `<Price>`. */
  price:            number;
  /** Description text shown in the in-game tooltip. From `<Description>`. */
  description:      string;
  /** General armour/resistance factor for damage calculations. From `<ArmorValue>`. */
  armor:            number;
  /** Whether the block can be placed by players/build systems. From `<Placable>`. */
  isPlacable:       boolean;
  /** Whether the block appears in shop/trading systems. From `<InShop>`. */
  inShop:           boolean;
  /** Whether the block stores orientation when placed. From `<Orientation>`. */
  hasOrientation:   boolean;
  /**
   * Whether the block can be toggled/activated by players (gameplay).
   * Does NOT imply a texture change — see `hasActivationTexture`.
   * From `<CanActivate>`.
   */
  canActivate:      boolean;
  /** Marks the block as obsolete while preserving XML compatibility. From `<Deprecated>`. */
  isDeprecated:     boolean;
  /**
   * Mesh shape selection. Maps to geometry builders:
   *  0=Cube, 1=Wedge, 2=Corner, 3=Cross, 4=Tetra, 5=Penta, 6=Hepta.
   * From `<BlockStyle>`.
   */
  blockStyle:       number;
  /**
   * Slab thickness flag:
   *  0=full block, 1=3/4, 2=1/2, 3=1/4.
   * The slab reduces depth along the block's local Z axis.
   * From `<Slab>`.
   */
  slab:             number;
  /** IDs of slab variants associated with this block. From `<SlabIds>`. */
  slabIds:          number[];
  /** IDs of alternate style/shape variants. From `<StyleIds>`. */
  styleIds:         number[];
  /**
   * Per-damage-type armour modifiers keyed by type name (Heat, Kinetic, EM).
   * From `<EffectArmor>` sub-elements.
   */
  effectArmor:      Record<string, number>;
  /**
   * Numeric ID of the controller/computer block linked to this system block.
   * 0 = no reference. From `<BlockComputerReference>`.
   */
  computerReference: number;
  /**
   * Whether the block emits light when active.
   * Light parameters come from `lightSourceColor`. From `<LightSource>`.
   */
  lightSource:      boolean;
  /**
   * RGBA light emission colour+intensity:
   *  [R, G, B, W] where RGB are 0–1 colour channels and W is the intensity multiplier.
   * Source: `ElementInformation.LightSourceColor` + `Occlusion.java` rendering.
   * From `<LightSourceColor>` (comma-separated float string).
   */
  lightSourceColor: number[];
  /** Enables transparent/blended rendering. From `<Transparency>`. */
  transparency:     boolean;
  /** Door-type behaviour flag used by opening/closing systems. From `<Door>`. */
  door:             boolean;
  /** Whether the block participates in the logic network. From `<LogicBlock>`. */
  logicBlock:       boolean;
  /**
   * UV face grouping mode:
   *  1=all faces share textureId[0],
   *  3=grouped (front/back, top/bottom, sides),
   *  6=all six faces independent.
   * From `<IndividualSides>`.
   */
  individualSides:  number;
  /**
   * When true, the side texture lookup rotates with the block's orientation.
   * Used by oriented/rail blocks to keep face textures aligned after rotation.
   * From `<SideTexturesPointToOrientation>`.
   */
  sideTexturesPointToOrientation: boolean;
  /**
   * Enables active/inactive texture switching.
   * When true and the block is inactive, textureId[face] + 1 is used.
   * Source: `ElementInformation.getTextureId()`.
   * From `<HasActivationTexture>`.
   */
  hasActivationTexture: boolean;
  /**
   * Uses an extended 4×4 texture footprint instead of a single tile.
   * From `<ExtendedTexture4x4>`.
   */
  extendedTexture4x4: boolean;
  /**
   * Block is only rendered in build/edit mode — invisible in normal gameplay.
   * Used for helper/preview-only blocks. From `<OnlyDrawnInBuildMode>`.
   */
  onlyDrawnInBuildMode: boolean;
  /**
   * LOD mesh reference used when the block is rendered at great distance.
   * 0 = no LOD shape. From `<LodShapeFromFar>`.
   */
  lodShapeFromFar:   number;
  /**
   * When true the block texture cycles through a range of 4 tiles at ~0.5s intervals.
   * Source: cube shader animation logic. From `<Animated>`.
   */
  animated:          boolean;
  /**
   * All other BlockConfig.xml XML elements not mapped to named fields above.
   * Preserved verbatim and round-tripped back on save to maintain XML compatibility.
   * Covers: recipe, factory, chamber, controller, collision, LOD, logic fields, etc.
   */
  extraProperties:  Record<string, unknown>;
  /**
   * True if this block was loaded from `customBlockConfig/BlockConfigImport.xml`.
   * Custom blocks can be modified and deleted; vanilla blocks cannot be deleted.
   */
  isCustom:         boolean;
}

// =============================================================================
// XML parser / builder configuration
// =============================================================================

/**
 * Shared fast-xml-parser instance for reading BlockConfig.xml files.
 *
 * Configuration:
 *  - `ignoreAttributes: false`  — attributes are parsed (with `@_` prefix).
 *  - `parseTagValue: true`      — boolean/number text nodes become JS types.
 *  - `isArray: (name) => …`     — `<Block>` is always treated as an array even
 *                                  when only one block exists in the file.
 */
const PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  parseTagValue:       true,
  trimValues:          true,
  isArray:             (name) => ['Block'].includes(name),
});

/**
 * Shared fast-xml-parser builder for writing customBlockConfig XML.
 *
 * Produces indented, human-readable XML compatible with the StarMade schema.
 */
const BUILDER = new XMLBuilder({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  format:              true,
  indentBy:            '  ',
});

// =============================================================================
// In-memory block cache
// =============================================================================

/**
 * Mtime-keyed in-memory cache for parsed block definitions.
 *
 * Invalidated whenever a write operation modifies the custom XML file, or
 * when `BlockTypes.properties` / `BlockConfig.xml` mtime values change.
 */
const blockCache: {
  dir: string;
  typeIdsMtime: number;
  typeIds: Map<string, number> | null;
  vanillaMtime: number;
  customMtime: number;
  blocks: BlockDef[] | null;
} = {
  dir: '',
  typeIdsMtime: -1,
  typeIds: null,
  vanillaMtime: -1,
  customMtime: -1,
  blocks: null,
};

// =============================================================================
// Utility: file modification time
// =============================================================================

/**
 * Return the modification time of a file in milliseconds, or `-1` if the file
 * does not exist or cannot be stat-ed.
 *
 * @param {string} filePath Absolute path to the file.
 * @returns {number} Modification time in ms, or -1.
 */
function fileMtimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return -1;
  }
}

/**
 * Clear the cached block list (but not the type ID map).
 * Called after every write operation so the next read picks up fresh data.
 */
function invalidateBlockCache(): void {
  blockCache.blocks = null;
  blockCache.vanillaMtime = -1;
  blockCache.customMtime = -1;
}

// =============================================================================
// Config file helpers
// =============================================================================

/**
 * Read the current StarMade game directory from `SMToolConfig.json`.
 *
 * Resolves the raw path through `resolveStarmadeRoot` which handles WSL/Windows
 * path conversion and auto-detects nested `StarMade/` install directories.
 *
 * @returns {string} Absolute path to the StarMade game root.
 * @throws {Error} If `SMToolConfig.json` is missing or `starmadeDir` is not set.
 */
function getStarmadeDir(): string {
  const cfgPath = path.resolve(process.cwd(), 'SMToolConfig.json');
  if (!fs.existsSync(cfgPath))
    throw new Error('SMToolConfig.json not found. Configure starmadeDir first.');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { starmadeDir?: string };
  if (!cfg.starmadeDir)
    throw new Error('starmadeDir is not set in SMToolConfig.json.');
  return resolveStarmadeRoot(cfg.starmadeDir);
}

// =============================================================================
// Parsing helpers
// =============================================================================

/**
 * Safely parse a raw XML value as a boolean.
 *
 * Handles the mixed types produced by fast-xml-parser (boolean, string, null,
 * undefined) and the XML convention of "true"/"false" text nodes.
 *
 * @param {unknown} v   Raw value from the parsed XML object.
 * @param {boolean} def Default value when `v` is absent or unrecognisable.
 * @returns {boolean} Parsed boolean value.
 */
function parseBool(v: unknown, def = false): boolean {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  return String(v).trim().toLowerCase() === 'true';
}

/**
 * Parse a comma-separated integer list from a raw XML attribute value.
 *
 * Used for `textureId`, `slabIds`, and `styleIds` attributes.
 * Invalid / non-numeric entries are filtered out.
 *
 * @param {unknown} v Raw comma-separated string.
 * @returns {number[]} Parsed integer array (may be empty).
 */
function parseIntList(v: unknown): number[] {
  if (!v || String(v).trim() === '') return [];
  return String(v)
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));
}

/**
 * Parse the `<EffectArmor>` XML sub-element into a plain Record.
 *
 * The `EffectArmor` node contains child elements named after damage types
 * (Heat, Kinetic, EM). Attribute keys (`@_*`) are skipped.
 *
 * @param {unknown} v Raw EffectArmor object from the parser.
 * @returns {Record<string, number>} Map of damage-type name → resistance value.
 */
export function parseEffectArmor(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    if (key.startsWith('@_')) continue;
    const parsed = parseFloat(String(value));
    if (Number.isFinite(parsed)) out[key] = parsed;
  }
  return out;
}

/**
 * Serialise an `effectArmor` Record back to the XML format expected by
 * fast-xml-parser. Returns `undefined` (omit the element) when the map is empty.
 *
 * @param {Record<string, number>} v EffectArmor values to serialise.
 * @returns {Record<string, number> | undefined} XML-ready object, or undefined.
 */
export function serializeEffectArmor(v: Record<string, number>): Record<string, number> | undefined {
  const entries = Object.entries(v ?? {}).filter(
    ([, value]) => typeof value === 'number' && Number.isFinite(value),
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

/**
 * Set of XML element names that are handled as explicit named fields in `BlockDef`.
 * Any element NOT in this set is collected into `extraProperties` for round-trip
 * preservation.
 */
const KNOWN_BLOCK_TAGS = new Set([
  'Hitpoints', 'Mass', 'Volume', 'Price', 'Description', 'ArmorValue',
  'Placable', 'InShop', 'Orientation', 'CanActivate', 'Deprecated',
  'BlockStyle', 'Slab', 'SlabIds', 'StyleIds', 'EffectArmor',
  'BlockComputerReference', 'LightSource', 'LightSourceColor', 'Transparency',
  'Door', 'LogicBlock', 'IndividualSides', 'SideTexturesPointToOrientation',
  'HasActivationTexture', 'ExtendedTexture4x4', 'OnlyDrawnInBuildMode',
  'LodShapeFromFar', 'Animated',
]);

/**
 * Collect all XML child elements of a block node that are not explicitly handled
 * as named fields. These are preserved in `extraProperties` so they survive the
 * read → edit → write round-trip without data loss.
 *
 * Attribute keys (starting with `@_`) and all `KNOWN_BLOCK_TAGS` are excluded.
 *
 * @param {Record<string, unknown>} node Raw parsed block node.
 * @returns {Record<string, unknown>} Extra properties object.
 */
export function collectExtraProperties(node: Record<string, unknown>): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@_') || KNOWN_BLOCK_TAGS.has(key)) continue;
    extra[key] = value;
  }
  return extra;
}

/**
 * Parse the `<LightSourceColor>` element value into a normalised `[R, G, B, W]` array.
 *
 * StarMade stores light colour as a comma-separated float string:
 * `"0.5, 0.8, 1.0, 1.5"` where W is the intensity multiplier.
 * Missing channels default to 0; the W (intensity) channel defaults to 1.
 *
 * @param {unknown} v Raw element value from the parser.
 * @returns {number[]} Normalised [R, G, B, W] array (always 4 elements).
 */
function parseLightColor(v: unknown): number[] {
  if (!v || String(v).trim() === '') return [1, 1, 1, 1];
  const values = String(v)
    .split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n));
  // Pad to 4 channels: fill RGB with 0 if missing, W defaults to 1.
  while (values.length < 4) values.push(values.length === 3 ? 1 : 0);
  return values.slice(0, 4);
}

// =============================================================================
// BlockTypes.properties loader
// =============================================================================

/**
 * Load the `BlockTypes.properties` file and return a Map of type name → block ID.
 *
 * The file is a Java `.properties` format:
 *   `GREY_HULL=75`
 *   `HULL_COLOR_GREY=75` (aliases are possible)
 *
 * Results are cached by file mtime; the cache is shared across requests.
 *
 * @param {string} dir StarMade game root directory.
 * @returns {Map<string, number>} Map of XML type name → numeric block ID.
 */
function loadTypeIds(dir: string): Map<string, number> {
  const filePath = path.join(dir, 'data', 'config', 'BlockTypes.properties');
  const mtime = fileMtimeMs(filePath);

  // Return cached result if the file hasn't changed.
  if (blockCache.dir === dir && blockCache.typeIds && blockCache.typeIdsMtime === mtime) {
    return blockCache.typeIds;
  }

  const map = new Map<string, number>();
  if (mtime < 0) return map; // File does not exist — return empty map.

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue; // Skip comments and blank lines.
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const name = t.slice(0, eq).trim();
    const id   = parseInt(t.slice(eq + 1).trim(), 10);
    if (name && !isNaN(id)) map.set(name, id);
  }

  blockCache.dir = dir;
  blockCache.typeIdsMtime = mtime;
  blockCache.typeIds = map;
  return map;
}

// =============================================================================
// Block ID resolution
// =============================================================================

/**
 * Resolve a block's numeric ID from the raw `@_type` attribute value.
 *
 * StarMade XML uses symbolic type names (`"GREY_HULL"`) for vanilla blocks and
 * occasionally raw numeric IDs for custom blocks. Both forms are handled:
 *  - If the value is a non-zero integer string, return it directly.
 *  - Otherwise look up the name in the type ID map.
 *  - Fall back to 0 if resolution fails.
 *
 * @param {unknown} rawType         Raw `@_type` attribute value.
 * @param {Map<string, number>} typeIds Type ID lookup map.
 * @returns {number} Resolved numeric block ID (0 if not found).
 */
function resolveBlockId(rawType: unknown, typeIds: Map<string, number>): number {
  const value = String(rawType ?? '').trim();
  const parsed = parseInt(value, 10);
  // Treat as a direct ID only when the entire string parses as a positive integer.
  if (!isNaN(parsed) && parsed > 0 && String(parsed) === value) return parsed;
  return typeIds.get(value) ?? 0;
}

// =============================================================================
// XML tree traversal
// =============================================================================

/**
 * Recursively collect all `<Block>` element objects from a parsed XML tree.
 *
 * BlockConfig.xml has a deep nesting structure:
 * `Config > Element > General > Custom > Block[]`
 * The exact path varies; this function traverses the entire tree to locate all
 * `Block` arrays regardless of their nesting depth.
 *
 * @param {unknown}                   node Parsed XML node to traverse.
 * @param {Record<string, unknown>[]} out  Accumulator for collected block objects.
 */
function collectBlockNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) collectBlockNodes(item, out);
    return;
  }

  const obj = node as Record<string, unknown>;

  // Collect all Block elements at this level.
  if (Array.isArray(obj.Block)) {
    for (const block of obj.Block) {
      if (block && typeof block === 'object') out.push(block as Record<string, unknown>);
    }
  }

  // Recurse into all non-attribute, non-Block children.
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('@_') || key === 'Block') continue;
    collectBlockNodes(value, out);
  }
}

// =============================================================================
// Block parsing
// =============================================================================

/**
 * Convert a single parsed XML `<Block>` object into a typed `BlockDef`.
 *
 * Returns `null` if the block ID cannot be resolved (missing/invalid `@_type`).
 *
 * @param {Record<string, unknown>} node     Parsed XML block node.
 * @param {Map<string, number>}     typeIds  Type-name→ID lookup map.
 * @param {boolean}                 isCustom Whether this block is from the custom file.
 * @returns {BlockDef | null} Parsed block definition, or null if ID is invalid.
 */
function parseBlock(
  node: Record<string, unknown>,
  typeIds: Map<string, number>,
  isCustom: boolean,
): BlockDef | null {
  const rawType = node['@_type'];
  const id = resolveBlockId(rawType, typeIds);
  if (id <= 0) return null;

  return {
    id,
    name:              String(node['@_name'] ?? ''),
    icon:              parseInt(String(node['@_icon'] ?? '0'), 10) || 0,
    textureId:         parseIntList(node['@_textureId']),
    xmlTypeName:       String(rawType ?? id),
    hp:                parseInt(String(node.Hitpoints ?? '0'), 10) || 0,
    mass:              parseFloat(String(node.Mass ?? '0')) || 0,
    volume:            parseFloat(String(node.Volume ?? '0')) || 0,
    price:             parseInt(String(node.Price ?? '0'), 10) || 0,
    description:       String(node.Description ?? ''),
    armor:             parseFloat(String(node.ArmorValue ?? '0')) || 0,
    isPlacable:        parseBool(node.Placable, true),
    inShop:            parseBool(node.InShop, true),
    hasOrientation:    parseBool(node.Orientation, false),
    canActivate:       parseBool(node.CanActivate, false),
    isDeprecated:      parseBool(node.Deprecated, false),
    blockStyle:        parseInt(String(node.BlockStyle ?? '0'), 10) || 0,
    slab:              parseInt(String(node.Slab ?? '0'), 10) || 0,
    slabIds:           parseIntList(node.SlabIds),
    styleIds:          parseIntList(node.StyleIds),
    effectArmor:       parseEffectArmor(node.EffectArmor),
    computerReference: parseInt(String(node.BlockComputerReference ?? '0'), 10) || 0,
    lightSource:       parseBool(node.LightSource, false),
    lightSourceColor:  parseLightColor(node.LightSourceColor),
    transparency:      parseBool(node.Transparency, false),
    door:              parseBool(node.Door, false),
    logicBlock:        parseBool(node.LogicBlock, false),
    individualSides:   parseInt(String(node.IndividualSides ?? '1'), 10) || 1,
    sideTexturesPointToOrientation: parseBool(node.SideTexturesPointToOrientation, false),
    hasActivationTexture: parseBool(node.HasActivationTexture, false),
    extendedTexture4x4: parseBool(node.ExtendedTexture4x4, false),
    onlyDrawnInBuildMode: parseBool(node.OnlyDrawnInBuildMode, false),
    lodShapeFromFar:   parseInt(String(node.LodShapeFromFar ?? '0'), 10) || 0,
    animated:          parseBool(node.Animated, false),
    extraProperties:   collectExtraProperties(node),
    isCustom,
  };
}

/**
 * Parse all blocks from a single BlockConfig XML file.
 *
 * @param {string}               filePath Path to the XML file.
 * @param {Map<string, number>}  typeIds  Type-name→ID lookup.
 * @param {boolean}              isCustom Marks all parsed blocks as custom/vanilla.
 * @returns {BlockDef[]} All valid blocks from the file.
 */
function parseBlockFile(
  filePath: string,
  typeIds: Map<string, number>,
  isCustom: boolean,
): BlockDef[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = PARSER.parse(fs.readFileSync(filePath, 'utf8'));
  const nodes: Record<string, unknown>[] = [];
  collectBlockNodes(raw, nodes);
  return nodes
    .map(node => parseBlock(node, typeIds, isCustom))
    .filter((b): b is BlockDef => b !== null);
}

// =============================================================================
// Block loading (with mtime cache)
// =============================================================================

/**
 * Load all block definitions from both vanilla and custom XML files.
 *
 * Custom blocks override vanilla blocks with the same ID.
 * Results are sorted ascending by block ID for deterministic ordering.
 *
 * Uses the mtime cache: if neither file has changed since the last load,
 * returns the cached result without any file I/O.
 *
 * @returns {BlockDef[]} All blocks sorted by ID.
 */
function loadAllBlocks(): BlockDef[] {
  const dir = getStarmadeDir();
  const vanillaPath = path.join(dir, 'data', 'config', 'BlockConfig.xml');
  const customPath  = path.join(dir, 'customBlockConfig', 'BlockConfigImport.xml');
  const vanillaMtime = fileMtimeMs(vanillaPath);
  const customMtime  = fileMtimeMs(customPath);

  // Return cached blocks if nothing has changed.
  if (
    blockCache.dir === dir &&
    blockCache.blocks &&
    blockCache.vanillaMtime === vanillaMtime &&
    blockCache.customMtime === customMtime
  ) {
    return blockCache.blocks;
  }

  const typeIds = loadTypeIds(dir);
  const blocks = new Map<number, BlockDef>();

  // Load vanilla blocks first; custom blocks overwrite same-ID entries.
  for (const block of parseBlockFile(vanillaPath, typeIds, false)) {
    blocks.set(block.id, block);
  }
  for (const block of parseBlockFile(customPath, typeIds, true)) {
    blocks.set(block.id, block);
  }

  const sorted = [...blocks.values()].sort((a, b) => a.id - b.id);
  blockCache.dir = dir;
  blockCache.vanillaMtime = vanillaMtime;
  blockCache.customMtime = customMtime;
  blockCache.blocks = sorted;
  return sorted;
}

// =============================================================================
// Serialisation helpers
// =============================================================================

/**
 * Determine the XML `@_type` value to write for a block.
 *
 * - If `xmlTypeName` is numeric or looks like a generated custom name
 *   (`CUSTOM_BLOCK_*`), write the numeric ID directly.
 * - Otherwise preserve the original symbolic name (e.g. `"GREY_HULL"`).
 *
 * @param {BlockDef} def Block definition to serialise.
 * @returns {string | number} The value to write as the `@_type` attribute.
 */
function serializeType(def: BlockDef): string | number {
  if (/^\d+$/.test(def.xmlTypeName)) return def.id;
  if (/^CUSTOM_BLOCK_/i.test(def.xmlTypeName)) return def.id;
  return def.xmlTypeName || def.id;
}

/**
 * Convert a `BlockDef` into the XML object structure expected by fast-xml-parser's
 * `XMLBuilder`. Extra properties are spread first so named fields take precedence
 * if there is a naming conflict.
 *
 * @param {BlockDef} def Block definition to convert.
 * @returns {Record<string, unknown>} XML-ready object.
 */
function serializeBlock(def: BlockDef): Record<string, unknown> {
  return {
    // Spread extra properties first so explicit fields always win.
    ...(def.extraProperties ?? {}),
    '@_icon':                         String(def.icon),
    '@_name':                         def.name,
    '@_textureId':                    def.textureId.join(', '),
    '@_type':                         serializeType(def),
    Hitpoints:                        def.hp,
    Mass:                             def.mass,
    Volume:                           def.volume,
    Price:                            def.price,
    Description:                      def.description,
    ArmorValue:                       def.armor,
    Placable:                         def.isPlacable,
    InShop:                           def.inShop,
    Orientation:                      def.hasOrientation,
    CanActivate:                      def.canActivate,
    Deprecated:                       def.isDeprecated,
    BlockStyle:                       def.blockStyle,
    Slab:                             def.slab,
    SlabIds:                          def.slabIds.join(', '),
    StyleIds:                         def.styleIds.join(', '),
    EffectArmor:                      serializeEffectArmor(def.effectArmor),
    BlockComputerReference:           def.computerReference,
    LightSource:                      def.lightSource,
    LightSourceColor:                 def.lightSourceColor.join(','),
    Transparency:                     def.transparency,
    Door:                             def.door,
    LogicBlock:                       def.logicBlock,
    IndividualSides:                  def.individualSides,
    SideTexturesPointToOrientation:   def.sideTexturesPointToOrientation,
    HasActivationTexture:             def.hasActivationTexture,
    ExtendedTexture4x4:               def.extendedTexture4x4,
    OnlyDrawnInBuildMode:             def.onlyDrawnInBuildMode,
    LodShapeFromFar:                  def.lodShapeFromFar,
    Animated:                         def.animated,
  };
}

// =============================================================================
// Custom block file management
// =============================================================================

/**
 * Load the current state of `customBlockConfig/BlockConfigImport.xml`.
 *
 * Creates the `customBlockConfig/` directory if it does not exist.
 * Returns a Map keyed by block ID so individual entries can be updated or deleted.
 *
 * @returns {{ customPath: string; blocks: Map<number, BlockDef> }}
 *   The path to the custom XML file and the current block map.
 */
function getCustomBlockState(): { customPath: string; blocks: Map<number, BlockDef> } {
  const dir = getStarmadeDir();
  const customDir  = path.join(dir, 'customBlockConfig');
  const customPath = path.join(customDir, 'BlockConfigImport.xml');
  const typeIds = loadTypeIds(dir);

  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });

  const blocks = new Map<number, BlockDef>();
  for (const block of parseBlockFile(customPath, typeIds, true)) {
    blocks.set(block.id, block);
  }

  return { customPath, blocks };
}

/**
 * Write all custom blocks to `customBlockConfig/BlockConfigImport.xml` and
 * invalidate the in-memory cache.
 *
 * Blocks are sorted by ID before writing for a deterministic file order.
 * The file begins with an XML declaration for compatibility with the StarMade parser.
 *
 * @param {string}                customPath Absolute path to the custom XML file.
 * @param {Map<number, BlockDef>} blocks     Current custom block map (after any edits).
 */
function writeCustomBlocks(customPath: string, blocks: Map<number, BlockDef>): void {
  const xml = BUILDER.build({
    Config: {
      Element: {
        General: {
          Custom: {
            Block: [...blocks.values()]
              .sort((a, b) => a.id - b.id)
              .map(serializeBlock),
          },
        },
      },
    },
  });

  fs.writeFileSync(
    customPath,
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml,
    'utf8',
  );
  invalidateBlockCache();
}

/**
 * Insert or update a block in the custom XML file.
 *
 * The block is always written with `isCustom: true`.
 *
 * @param {BlockDef} def Block definition to save.
 */
function saveCustomBlock(def: BlockDef): void {
  const { customPath, blocks } = getCustomBlockState();
  blocks.set(def.id, { ...def, isCustom: true });
  writeCustomBlocks(customPath, blocks);
}

/**
 * Remove a block from the custom XML file.
 *
 * @param {number} id Numeric block ID to remove.
 */
function deleteCustomBlock(id: number): void {
  const { customPath, blocks } = getCustomBlockState();
  blocks.delete(id);
  writeCustomBlocks(customPath, blocks);
}

// =============================================================================
// Router
// =============================================================================

export const blocksRouter = Router();

/**
 * GET /api/blocks
 * Returns all blocks (vanilla + custom) sorted by ID.
 */
blocksRouter.get('/', (_req: Request, res: Response) => {
  try {
    res.json(loadAllBlocks());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/blocks/:id
 * Returns a single block by numeric ID, or 404 if not found.
 */
blocksRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const block = loadAllBlocks().find(b => b.id === id);
    if (!block) return void res.status(404).json({ error: `Block ${id} not found.` });
    res.json(block);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * PUT /api/blocks/:id
 * Update a block's definition (vanilla or custom).
 * Promotes vanilla blocks to the custom file automatically.
 * Array and object fields are validated to prevent type corruption.
 */
blocksRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = loadAllBlocks().find(b => b.id === id);
    if (!existing) return void res.status(404).json({ error: `Block ${id} not found.` });

    const updated: BlockDef = {
      ...existing,
      ...req.body,
      id,
      isCustom: true, // Always promote to custom on save.
      // Validate array/object fields to prevent type corruption from malformed requests.
      textureId:        Array.isArray(req.body?.textureId)       ? req.body.textureId        : existing.textureId,
      slab:             typeof req.body?.slab === 'number'        ? req.body.slab             : existing.slab,
      slabIds:          Array.isArray(req.body?.slabIds)          ? req.body.slabIds          : existing.slabIds,
      styleIds:         Array.isArray(req.body?.styleIds)         ? req.body.styleIds         : existing.styleIds,
      effectArmor:      req.body?.effectArmor && typeof req.body.effectArmor === 'object'
        ? req.body.effectArmor : existing.effectArmor,
      lightSourceColor: Array.isArray(req.body?.lightSourceColor) ? req.body.lightSourceColor : existing.lightSourceColor,
      extraProperties:  req.body?.extraProperties && typeof req.body.extraProperties === 'object'
        ? req.body.extraProperties : existing.extraProperties,
    };

    saveCustomBlock(updated);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * POST /api/blocks
 * Create a new custom block with a generated ID (maxExistingId + 1, minimum 1000).
 * Accepts an optional partial body to pre-fill fields.
 */
blocksRouter.post('/', (req: Request, res: Response) => {
  try {
    const blocks = loadAllBlocks();
    // Assign an ID above the current maximum (and never below 1000 to avoid
    // collision with vanilla block IDs which are typically < 1000).
    const maxId = Math.max(...blocks.map(b => b.id), 999);
    const id    = maxId + 1;

    const created: BlockDef = {
      name:              'New Custom Block',
      icon:              0,
      textureId:         [0, 0, 0, 0, 0, 0],
      hp:                100,
      mass:              0.1,
      volume:            0.1,
      price:             100,
      description:       '',
      armor:             0.1,
      isPlacable:        true,
      inShop:            false,
      hasOrientation:    false,
      canActivate:       false,
      isDeprecated:      false,
      blockStyle:        0,
      slab:              0,
      slabIds:           [],
      styleIds:          [],
      effectArmor:       {},
      computerReference: 0,
      lightSource:       false,
      lightSourceColor:  [1, 1, 1, 1],
      transparency:      false,
      door:              false,
      logicBlock:        false,
      individualSides:   1,
      sideTexturesPointToOrientation: false,
      hasActivationTexture: false,
      extendedTexture4x4: false,
      onlyDrawnInBuildMode: false,
      lodShapeFromFar:   0,
      animated:          false,
      extraProperties:   {},
      isCustom:          true,
      ...req.body, // Allow pre-filling from request body.
      id,
      xmlTypeName: req.body?.xmlTypeName || `CUSTOM_BLOCK_${id}`,
    };

    saveCustomBlock(created);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * DELETE /api/blocks/:id
 * Delete a custom block by numeric ID.
 * Returns 403 if the block is a vanilla block (use Deprecated flag instead).
 */
blocksRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const block = loadAllBlocks().find(b => b.id === id);
    if (!block) return void res.status(404).json({ error: `Block ${id} not found.` });
    if (!block.isCustom) {
      return void res.status(403).json({
        error: 'Cannot delete vanilla blocks. Mark as deprecated instead.',
      });
    }
    deleteCustomBlock(id);
    res.json({ ok: true, deletedId: id });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
