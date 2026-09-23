/** @fileoverview Revision-checked block API backed by StarMade-Decoder and custom-only atomic persistence. */
import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import { configFilePath, loadConfig } from './config.js';
import { resolveStarmadeRoot } from '../utils/path.js';
import { getCatalogue, mutateCatalogue, CatalogueError, type Catalogue } from '../services/blockCatalog.js';
import { FileConflictError } from '../services/atomicFile.js';
import { toBlockDto } from '../services/blockDto.js';
export { collectExtraProperties, parseEffectArmor, serializeEffectArmor } from '../services/blockDto.js';

/** Complete detached block definition returned to the editor. */
export interface BlockDef {
  /** Numeric block ID from BlockTypes.properties. Unique per block. */
  id:               number;
  /** Revision of the source catalogue, used as the HTTP write precondition. */
  revision:         string;
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
   *  0=Cube, 1=Wedge, 2=Corner, 3=Cross, 4=Tetra, 5=Penta, 6=Normal24.
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
   * Enables the native texture animation represented by `<Animated>`.
   * The renderer resolves the animation frames and timing from native assets.
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

/** Resolves the configured installation without creating configuration during block reads. */
function configuredRoot(): string {
  if (!fs.existsSync(configFilePath())) throw new CatalogueError(500, 'SMToolConfig.json not found.');
  const config = loadConfig();
  if (!config.starmadeDir.trim()) throw new CatalogueError(400, 'Choose a StarMade installation first.');
  return resolveStarmadeRoot(config.starmadeDir);
}

/** Returns a JSON-safe definition with its custom provenance. */
function dto(catalogue: Catalogue, id: number): BlockDef {
  const block = catalogue.blocks.get(id);
  if (!block) throw new CatalogueError(404, 'Block not found.');
  return toBlockDto(block, catalogue.custom.getById(id) !== undefined, catalogue.revision);
}

/** Recovery keeps the draft intact until the user explicitly discards it. */
const conflictMessage = 'The catalogue changed. Your draft is preserved. Copy any edits you wish to keep first. Reload, then use Revert to load the current block before editing again.';

/** Requires an exact quoted ETag; wildcard writes are deliberately unsupported. */
function precondition(request: Request): string {
  const header = request.get('If-Match');
  if (header === undefined) throw new CatalogueError(428, 'Reload the catalogue and send its If-Match revision.');
  if (!/^"[a-f0-9]{64}"$/.test(header)) throw new CatalogueError(409, conflictMessage);
  return header.slice(1, -1);
}

/** Parses the entire route ID rather than accepting a numeric prefix. */
function routeId(request: Request): number {
  const id = Number(request.params.id);
  if (!/^\d+$/.test(request.params.id) || !Number.isInteger(id) || id < 1 || id > 4094) throw new TypeError('Invalid block ID');
  return id;
}

/** Maps expected failures without disclosing filesystem paths or internal stacks. */
function failure(response: Response, error: unknown): void {
  if (error instanceof CatalogueError) { response.status(error.status).json({ error: error.message }); return; }
  if (error instanceof FileConflictError) { response.status(409).json({ error: conflictMessage }); return; }
  if (error instanceof TypeError) { response.status(400).json({ error: error.message }); return; }
  response.status(500).json({ error: 'Unable to read or save block definitions.' });
}

/** Supplies a strong catalogue revision for both list and mutation responses. */
function etag(response: Response, catalogue: Catalogue): Response { return response.set('ETag', `"${catalogue.revision}"`); }

/** Best-effort startup cache warming, with failure handling left to the caller. */
export function warmBlockCache(): { dir: string; count: number } {
  const catalogue = getCatalogue(configuredRoot());
  return { dir: catalogue.root, count: catalogue.blocks.size };
}

/** Returns unique valid icon identifiers used by the current catalogue. */
export function getBlockIconIds(): number[] {
  return [...new Set([...getCatalogue(configuredRoot()).blocks.values()].map(block => block.icon)
    .filter(icon => Number.isInteger(icon) && icon >= 0))].sort((left, right) => left - right);
}

/** Block CRUD routes; source files remain read only and mutations require If-Match. */
export const blocksRouter = Router();
blocksRouter.get('/', (_request, response) => {
  try {
    const catalogue = getCatalogue(configuredRoot());
    etag(response, catalogue).json([...catalogue.blocks.keys()].sort((left, right) => left - right).map(id => dto(catalogue, id)));
  } catch (error) { failure(response, error); }
});
blocksRouter.get('/:id', (request, response) => {
  try {
    const catalogue = getCatalogue(configuredRoot());
    etag(response, catalogue).json(dto(catalogue, routeId(request)));
  } catch (error) { failure(response, error); }
});
blocksRouter.put('/:id', (request, response) => {
  try {
    const expected = precondition(request);
    const id = routeId(request);
    const catalogue = mutateCatalogue(configuredRoot(), expected, { kind: 'update', id, patch: request.body });
    etag(response, catalogue).json(dto(catalogue, id));
  } catch (error) { failure(response, error); }
});
blocksRouter.post('/', (request, response) => {
  try {
    const expected = precondition(request);
    const root = configuredRoot();
    const previous = getCatalogue(root);
    const catalogue = mutateCatalogue(root, expected, { kind: 'create', patch: request.body });
    const created = [...catalogue.blocks.keys()].find(id => !previous.blocks.has(id))!;
    etag(response, catalogue).status(201).json(dto(catalogue, created));
  } catch (error) { failure(response, error); }
});
blocksRouter.delete('/:id', (request, response) => {
  try {
    const expected = precondition(request);
    const id = routeId(request);
    const catalogue = mutateCatalogue(configuredRoot(), expected, { kind: 'delete', id });
    etag(response, catalogue).json({ ok: true, deletedId: id });
  } catch (error) { failure(response, error); }
});
