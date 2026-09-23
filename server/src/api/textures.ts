/**
 * @fileoverview Texture atlas API router.
 *
 * Serves StarMade block texture data to the client:
 *
 *  1. **Composite atlas** (`/atlas`) — a single PNG compositing all texture pages
 *     into a 64×32 tile grid for direct use in Three.js as a UV atlas texture.
 *
 *  2. **Icon extraction** (`/icon/:id`) — extracts a single 64×64 block icon
 *     from the StarMade build-icons sheet files.
 *
 *  3. **Custom atlas import** (`PUT /custom-atlas`) — replace the entire custom
 *     texture page (`custom.png`) with an uploaded image.
 *
 *  4. **Custom tile import** (`PUT /custom-tile/:id`) — replace a single tile
 *     within the custom texture page.
 *
 *  5. **Icon import** (`PUT /icon/:id`) — replace a single icon slot in the
 *     build-icons sheet.
 *
 *  6. **Utilities** — `/packs`, `/info`, `/tile/:id`, `/atlas-base64`.
 *
 * ## Atlas page layout
 * StarMade stores block textures in per-resolution PNG files. The editor
 * composites them into a single atlas (served at `/api/textures/atlas`):
 *
 *  Page index │ Source file           │ Tile IDs
 *  ───────────┼───────────────────────┼─────────────
 *      0      │ t000.png              │    0–255
 *      1      │ t001.png              │  256–511
 *      2      │ t002.png              │  512–767
 *      3      │ t003.png              │  768–1023
 *     4–6     │ (reserved, empty)     │ 1024–1791
 *      7      │ custom.png            │ 1792–2047
 *
 * The composite is a 64×32 tile grid (PAGE_GRID_COLS × PAGE_GRID_ROWS pages,
 * each page = 16×16 tiles). At 256 px/tile this is a 16384×8192 px PNG.
 *
 * ## Normal maps
 * Normal maps follow the same page structure but use `_NRM`-suffixed files
 * (`t000_NRM.png`, `custom_NRM.png`, etc.). They are served on a separate
 * `?map=normal` request. Background is flat-normal grey (128, 128, 255).
 *
 * ## Build icon sheets
 * Icons are stored as 1024×1024 sprite sheets:
 *   `data/image-resource/build-icons-NN-16x16-gui-.png`
 * where `NN` = zero-padded sheet number = `Math.floor(iconId / 256)`.
 * Each sheet holds 16×16 = 256 icon slots, each 64×64 px in the PNG.
 * Cell address: `col = (iconId % 256) % 16`, `row = Math.floor((iconId % 256) / 16)`.
 *
 * @module api/textures
 * @author InitSysRev
 * @version 1.0.0
 */

import express, { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getBlockIconIds } from './blocks.js';
import { loadConfig } from './config.js';
import { resolveStarmadeRoot } from '../utils/path.js';
import { AssetError, assetStamp, confinedPath } from '../assets/assetPaths.js';
import { atlasSources } from '../assets/textureSources.js';
import { findNativeImage, readNativePng, replacePixels, resizeNormalPng, type NativeImage } from '../assets/nativeImage.js';
import { atomicWriteFile, fileRevision, FileConflictError } from '../services/atomicFile.js';

// =============================================================================
// Constants
// =============================================================================

/** Permitted atlas tile resolutions (pixels per tile). */
const VALID_SIZES = [64, 128, 256] as const;
type TileSize = typeof VALID_SIZES[number];

/** Map kind identifier. */
type TextureMapKind = 'diffuse' | 'normal';

/** Number of tile columns per texture page (one vanilla PNG = 16×16 tiles). */
const PAGE_TILE_COLS = 16;

/** Number of tile rows per texture page. */
const PAGE_TILE_ROWS = 16;

/** Total tiles per page (16 × 16 = 256). */
const PAGE_TILES = PAGE_TILE_COLS * PAGE_TILE_ROWS;

/** Number of page columns in the composite atlas. */
const PAGE_GRID_COLS = 4;

/** Number of page rows in the composite atlas. */
const PAGE_GRID_ROWS = 2;

/** Total pages in the composite (4 × 2 = 8, of which 4 are populated by vanilla + custom). */
const PAGE_COUNT = PAGE_GRID_COLS * PAGE_GRID_ROWS;

/** Total tile columns in the composite atlas (PAGE_TILE_COLS × PAGE_GRID_COLS = 64). */
const ATLAS_COLS = PAGE_TILE_COLS * PAGE_GRID_COLS;

/** Total tile rows in the composite atlas (PAGE_TILE_ROWS × PAGE_GRID_ROWS = 32). */
const ATLAS_ROWS = PAGE_TILE_ROWS * PAGE_GRID_ROWS;

/** Total tiles in the composite atlas (64 × 32 = 2048). */
const TOTAL_TILES = PAGE_TILES * PAGE_COUNT;

// =============================================================================
// In-memory caches
// =============================================================================

/**
 * In-memory cache for composite atlas PNG buffers.
 * Key includes installation, pack, resolution, map and filesystem revision. Imports invalidate it.
 * Each entry is a Promise<Buffer> for deduplication of concurrent requests.
 */
const atlasBufferCache = new Map<string, Promise<Buffer>>();

/**
 * In-memory cache for extracted icon PNG buffers.
 * Key includes the canonical sheet and icon ID; entries track the sheet filesystem revision.
 */
const iconBufferCache = new Map<string, { stamp: string; pending: Promise<Buffer> }>();
let iconInstallation = '';

// =============================================================================
// Config file helpers
// =============================================================================

/**
 * Read the current StarMade directory from `SMToolConfig.json`.
 *
 * @returns {string} Absolute, runtime-normalised path to the StarMade root.
 * @throws {Error} If `SMToolConfig.json` is missing.
 */
function getStarmadeDir(): string {
  const p = path.resolve(process.cwd(), 'SMToolConfig.json');
  if (!fs.existsSync(p) && !process.env.EDITOR_FIXED_STARMADE_DIR) throw new Error('SMToolConfig.json missing.');
  const configured = loadConfig().starmadeDir;
  if (!configured) throw new AssetError('Configure a StarMade installation first.', 503);
  return resolveStarmadeRoot(configured);
}

// =============================================================================
// Request parameter parsers
// =============================================================================

/**
 * Parse and validate the `?size=` query parameter.
 *
 * @param {unknown} raw Raw query value.
 * @returns {TileSize} Validated tile size; falls back to 256 if invalid.
 */
export function parseSize(raw: unknown): TileSize {
  const n = parseInt(String(raw), 10);
  return (VALID_SIZES as readonly number[]).includes(n) ? (n as TileSize) : 256;
}

/**
 * Parse and sanitise the `?pack=` query parameter.
 *
 * Strips path-traversal characters (`/`, `\`) to prevent directory traversal attacks.
 * Defaults to `"Default"` when empty.
 *
 * @param {unknown} raw Raw query value.
 * @returns {string} Sanitised texture pack name.
 */
export function parsePack(raw: unknown): string {
  const value = String(raw ?? 'Default').trim() || 'Default';
  return value.replace(/[\\/]/g, '');
}

/**
 * Parse the `?map=` query parameter.
 *
 * @param {unknown} raw Raw query value.
 * @returns {TextureMapKind} `'normal'` if the value is `"normal"`, otherwise `'diffuse'`.
 */
export function parseMapKind(raw: unknown): TextureMapKind {
  return String(raw ?? 'diffuse').trim().toLowerCase() === 'normal' ? 'normal' : 'diffuse';
}

// =============================================================================
// File path helpers
// =============================================================================

/**
 * Absolute path to the texture pack directory for a given pack name and tile size.
 *
 * @param {string}   pack StarMade texture pack name (e.g. `"Default"`).
 * @param {TileSize} size Tile resolution in pixels.
 * @returns {string} Absolute directory path.
 */
function getTexturePackDir(pack: string, size: TileSize): string {
  return confinedPath(getStarmadeDir(), `data/textures/block/${pack}/${size}`);
}

/**
 * Build the ordered list of native PNG/TGA/archive paths for the composite atlas.
 *
 * Returns exactly 8 paths (one per page slot), using `''` for empty/reserved slots.
 * Only existing files contribute pixels; missing slots keep the neutral background.
 *
 * @param {TileSize}         size    Tile resolution in pixels.
 * @param {string}           pack    Texture pack name.
 * @param {TextureMapKind}   mapKind `'diffuse'` or `'normal'`.
 * @returns {string[]} 8-element array of source file paths.
 */
function getAtlasPagePaths(size: TileSize, pack: string, mapKind: TextureMapKind): string[] {
  return atlasSources(getStarmadeDir(), size, pack, mapKind).map(source => source?.path ?? '');
}

// =============================================================================
// Texture pack listing
// =============================================================================

/**
 * List all available texture packs in the StarMade installation.
 *
 * Scans `data/textures/block/` for subdirectories that contain at least one
 * `t000.png` file at a supported resolution.
 *
 * @param {TileSize} [size] Optional size filter — only returns packs that have
 *                          assets at this specific resolution.
 * @returns {Array<{ name: string; sizes: number[] }>} Available packs with their
 *          supported resolutions.
 */
function listTexturePacks(size?: TileSize): Array<{ name: string; sizes: number[] }> {
  const root = getStarmadeDir();
  if (!fs.existsSync(root)) return [];
  const base = confinedPath(root, 'data/textures/block');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({ name: entry.name, sizes: VALID_SIZES.filter(s => findNativeImage(getTexturePackDir(entry.name, s), 't000.png') !== null) }))
    .filter(pack => pack.sizes.length > 0)
    .filter(pack => size === undefined || pack.sizes.includes(size));
}

// =============================================================================
// Composite atlas builder
// =============================================================================

/**
 * Build the composite atlas PNG by copying exact RGBA pixels into their page slots.
 * Alpha is material data for normal maps, so source-over blending is never used.
 *
 * Page positions are computed from their index in the 4×2 grid:
 *   `left = (pageIndex % PAGE_GRID_COLS) * pageSizePx`
 *   `top  = Math.floor(pageIndex / PAGE_GRID_COLS) * pageSizePx`
 *
 * Missing pages (empty string or non-existent file) are silently skipped;
 * their slots in the composite remain filled with the background colour.
 *
 * @param {TileSize}       size    Tile resolution in pixels.
 * @param {string}         pack    Texture pack name.
 * @param {TextureMapKind} mapKind `'diffuse'` or `'normal'`.
 * @returns {Promise<Buffer>} PNG buffer of the full composite atlas.
 * @throws {Error} If no pages exist for the given pack/size/map combination.
 */
async function buildCompositeAtlas(
  size: TileSize, pack: string, mapKind: TextureMapKind, sources: Array<NativeImage | null>,
): Promise<Buffer> {
  const pageSize = PAGE_TILE_COLS * size;
  const width = ATLAS_COLS * size;
  const height = ATLAS_ROWS * size;
  if (!sources.some(Boolean)) throw new Error(`No ${mapKind} texture pages found for pack "${pack}" at size ${size}.`);
  const pixels = Buffer.alloc(width * height * 4);
  if (mapKind === 'normal') pixels.fill(Buffer.from([128, 128, 255, 0]));
  for (let layer = 0; layer < sources.length; layer++) {
    const source = sources[layer];
    if (!source) continue;
    const decoded = await sharp(await readNativePng(source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (decoded.info.width !== pageSize || decoded.info.height !== pageSize) throw new AssetError(`Invalid atlas page dimensions: expected ${pageSize}×${pageSize}px.`);
    const left = (layer % PAGE_GRID_COLS) * pageSize;
    const top = Math.floor(layer / PAGE_GRID_COLS) * pageSize;
    for (let row = 0; row < pageSize; row++) {
      decoded.data.copy(pixels, ((top + row) * width + left) * 4, row * pageSize * 4, (row + 1) * pageSize * 4);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Return the composite atlas buffer, building it if it is not in the cache.
 *
 * Concurrent requests for the same key share a single in-flight Promise.
 * The cache is cleared by `atlasBufferCache.clear()` after any import.
 *
 * @param {TileSize}       size    Tile resolution.
 * @param {string}         pack    Texture pack name.
 * @param {TextureMapKind} mapKind Map type.
 * @returns {Promise<Buffer>} Cached or freshly built atlas PNG buffer.
 */
function getCompositeAtlasBuffer(size: TileSize, pack: string, mapKind: TextureMapKind): Promise<Buffer> {
  const root = getStarmadeDir();
  const sources = atlasSources(root, size, pack, mapKind);
  const key = `${root}:${pack}:${size}:${mapKind}:` + sources.map(source => source ? assetStamp(source.path) : 'missing').join('|');
  let pending = atlasBufferCache.get(key);
  if (!pending) {
    // Keep at most the current diffuse/normal pair, rather than every historical revision.
    if (atlasBufferCache.size >= 2) atlasBufferCache.clear();
    pending = buildCompositeAtlas(size, pack, mapKind, sources).catch(error => { atlasBufferCache.delete(key); throw error; });
    atlasBufferCache.set(key, pending);
  }
  return pending;
}

/**
 * Warm the active atlas cache in memory using the current editor config.
 *
 * Pre-builds both diffuse and normal composite atlases for the configured
 * pack/size so the first viewer request does not pay the Sharp composition cost.
 * This reuses the normal atlas Promise cache, so concurrent real requests will
 * attach to the same work instead of duplicating it.
 *
 * @returns {Promise<{ pack: string; size: TileSize; diffuseBytes: number; normalBytes: number }>}
 *   Summary of the warmed atlas variant.
 */
export async function warmAtlasCache(): Promise<{
  pack: string;
  size: TileSize;
  diffuseBytes: number;
  normalBytes: number;
}> {
  const cfg = loadConfig();
  const size = parseSize(cfg.atlasSize);
  const pack = parsePack(cfg.texturePack);
  const [diffuse, normal] = await Promise.all([
    getCompositeAtlasBuffer(size, pack, 'diffuse'),
    getCompositeAtlasBuffer(size, pack, 'normal'),
  ]);

  return {
    pack,
    size,
    diffuseBytes: diffuse.byteLength,
    normalBytes: normal.byteLength,
  };
}

/**
 * Warm the build-icon cache for all unique icon IDs referenced by loaded blocks.
 *
 * Icons are extracted in small batches to avoid spawning hundreds of Sharp jobs
 * at once during startup.
 *
 * @returns {Promise<{ icons: number; sheets: number; failed: number }>}
 *   Summary of the icon cache warm-up.
 */
export async function warmIconCache(): Promise<{
  icons: number;
  sheets: number;
  failed: number;
}> {
  const iconIds = getBlockIconIds();
  const sheetCount = new Set(iconIds.map(id => Math.floor(id / 256))).size;
  let warmed = 0;
  let failed = 0;

  for (let i = 0; i < iconIds.length; i += 24) {
    const batch = iconIds.slice(i, i + 24);
    const results = await Promise.allSettled(batch.map(iconId => getBuildIcon(iconId)));
    for (const result of results) {
      if (result.status === 'fulfilled') warmed += 1;
      else failed += 1;
    }
  }

  return {
    icons: warmed,
    sheets: sheetCount,
    failed,
  };
}

// =============================================================================
// Icon helpers
// =============================================================================

/**
 * Build the absolute path to the icon sheet PNG that contains `iconId`.
 *
 * StarMade organises build icons in numbered 1024×1024 sprite sheets:
 *   `data/image-resource/build-icons-NN-16x16-gui-.png`
 * where `NN = Math.floor(iconId / 256)`, zero-padded to 2 digits.
 *
 * @param {number} iconId Block icon ID (from the `@_icon` XML attribute).
 * @returns {string} Absolute path to the icon sheet file.
 */
function buildIconPath(iconId: number): string {
  return confinedPath(getStarmadeDir(), `data/image-resource/build-icons-${String(Math.floor(iconId / 256)).padStart(2, '0')}-16x16-gui-.png`);
}

/**
 * Extract a single icon from a build-icons sprite sheet and return its PNG buffer.
 *
 * ## Icon coordinate calculation
 * Each sheet holds 16×16 icon slots (256 total), each slot is 64×64 px in the PNG.
 *  - `local = iconId % 256`  → slot index within the sheet
 *  - `col = local % 16`      → column in the sprite grid
 *  - `row = Math.floor(local / 16)` → row in the sprite grid
 *  - Extract region: `left=col*64, top=row*64, width=64, height=64`
 *
 * Results are cached by installation, sheet revision and icon ID; imports invalidate them.
 *
 * @param {number} iconId Block icon ID.
 * @returns {Promise<Buffer>} PNG buffer of the extracted 64×64 icon.
 * @throws {Error} If the icon sheet file does not exist.
 */
async function getBuildIcon(iconId: number): Promise<Buffer> {
  const root = getStarmadeDir();
  if (iconInstallation !== root) { iconBufferCache.clear(); iconInstallation = root; }
  const iconPath = buildIconPath(iconId);
  const stamp = assetStamp(iconPath);
  const key = `${iconPath}:${iconId}`;
  const cached = iconBufferCache.get(key);
  if (cached?.stamp === stamp) return cached.pending;
  const pending = (async () => {
    if (!fs.existsSync(iconPath)) throw new Error(`Build icon sheet not found for icon ${iconId}.`);
    const local = iconId % 256;
    return sharp(iconPath).extract({ left: (local % 16) * 64, top: Math.floor(local / 16) * 64, width: 64, height: 64 }).png().toBuffer();
  })().catch(error => { iconBufferCache.delete(key); throw error; });
  iconBufferCache.set(key, { stamp, pending });
  return pending;
}

// =============================================================================
// Custom atlas / tile creation helpers
// =============================================================================

/**
 * Ensure the custom texture file exists at the given path, creating a blank
 * canvas if necessary.
 *
 * The blank canvas is:
 *  - diffuse: transparent black (`{ r:0, g:0, b:0, alpha:0 }`)
 *  - normal:  flat-normal grey with no emission (`{ r:128, g:128, b:255, alpha:0 }`)
 *
 * @param {TileSize}       size    Tile resolution in pixels.
 * @param {TextureMapKind} mapKind `'diffuse'` or `'normal'`.
 * @returns {Promise<string>} Absolute path to the custom atlas file.
 */
async function ensureCustomAtlas(size: TileSize, mapKind: TextureMapKind): Promise<string> {
  const customPath = confinedPath(getStarmadeDir(), `customBlockTextures/${size}/${mapKind === 'normal' ? 'custom_NRM.png' : 'custom.png'}`);
  if (!fs.existsSync(customPath)) {
    const background = mapKind === 'normal' ? { r: 128, g: 128, b: 255, alpha: 0 } : { r: 0, g: 0, b: 0, alpha: 0 };
    const bytes = await sharp({ create: { width: PAGE_TILE_COLS * size, height: PAGE_TILE_ROWS * size, channels: 4, background } }).png().toBuffer();
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    atomicWriteFile(customPath, bytes, { expectedRevision: null });
  }
  return customPath;
}

/**
 * Replace the entire custom atlas page with an uploaded image.
 *
 * Validates that the uploaded image has the correct dimensions for the selected
 * tile size (PAGE_TILE_COLS × size pixels square).
 *
 * Clears the atlas buffer cache after writing.
 *
 * @param {TileSize}       size    Target tile resolution.
 * @param {TextureMapKind} mapKind `'diffuse'` or `'normal'`.
 * @param {Buffer}         input   PNG/JPEG/WebP buffer from the upload.
 * @throws {Error} If the image dimensions do not match the expected atlas page size.
 */
async function writeCustomAtlas(size: TileSize, mapKind: TextureMapKind, input: Buffer): Promise<void> {
  const customPath = confinedPath(getStarmadeDir(), `customBlockTextures/${size}/${mapKind === 'normal' ? 'custom_NRM.png' : 'custom.png'}`);
  const expectedRevision = fileRevision(customPath);
  const expected = PAGE_TILE_COLS * size;
  const metadata = await sharp(input).metadata();
  if (metadata.width !== expected || metadata.height !== expected) throw new AssetError(`Invalid custom atlas size. Expected ${expected}×${expected}px.`);
  const normalized = await sharp(input).png().toBuffer();
  fs.mkdirSync(path.dirname(customPath), { recursive: true });
  atomicWriteFile(customPath, normalized, { expectedRevision });
  atlasBufferCache.clear();
}

/**
 * Replace a single tile in the custom atlas page.
 *
 * `tileId` may be either:
 *  - An absolute custom tile ID (1792–2047), or
 *  - A local slot index (0–255) which is treated as-is.
 *
 * The input image is scaled to `size × size` pixels with `cover` fit before
 * replacing the correct cell of the custom atlas without alpha blending.
 *
 * Clears the atlas buffer cache after writing.
 *
 * @param {number}         tileId  Target tile ID or local slot index.
 * @param {TileSize}       size    Tile resolution in pixels.
 * @param {TextureMapKind} mapKind `'diffuse'` or `'normal'`.
 * @param {Buffer}         input   Source image buffer.
 * @throws {Error} If `tileId` is out of range.
 */
async function writeCustomTile(tileId: number, size: TileSize, mapKind: TextureMapKind, input: Buffer): Promise<void> {
  const local = tileId >= PAGE_TILES * 7 ? tileId - PAGE_TILES * 7 : tileId;
  if (local < 0 || local >= PAGE_TILES) throw new AssetError(`Custom tile target must be 0–255 or 1792–2047. Received: ${tileId}`);
  const tile = mapKind === 'normal' ? await resizeNormalPng(input, size) : await sharp(input).resize(size, size, { fit: 'cover' }).png().toBuffer();
  const customPath = await ensureCustomAtlas(size, mapKind);
  const expectedRevision = fileRevision(customPath);
  const updated = await replacePixels(fs.readFileSync(customPath), tile, (local % PAGE_TILE_COLS) * size, Math.floor(local / PAGE_TILE_COLS) * size);
  atomicWriteFile(customPath, updated, { expectedRevision });
  atlasBufferCache.clear();
}

/**
 * Replace a single icon slot in the build-icons sprite sheet.
 *
 * The input image is scaled to 64×64 px (with transparent padding if needed)
 * before replacing the correct cell, including transparent source pixels.
 *
 * Clears the icon buffer cache after writing.
 *
 * @param {number} iconId Block icon ID to replace.
 * @param {Buffer} input  Source image buffer.
 * @throws {Error} If the icon sheet file does not exist.
 */
async function writeBuildIcon(iconId: number, input: Buffer): Promise<void> {
  const iconPath = buildIconPath(iconId);
  if (!fs.existsSync(iconPath)) throw new Error(`Build icon sheet not found for icon ${iconId}.`);
  const expectedRevision = fileRevision(iconPath);
  const original = fs.readFileSync(iconPath);
  const icon = await sharp(input).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const local = iconId % 256;
  const updated = await replacePixels(original, icon, (local % 16) * 64, Math.floor(local / 16) * 64);
  const backup = iconBackupPath(iconId);
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    atomicWriteFile(backup, original, { expectedRevision: null });
  }
  atomicWriteFile(iconPath, updated, { expectedRevision });
  iconBufferCache.clear();
}

function iconBackupPath(iconId: number): string {
  return confinedPath(getStarmadeDir(), `customBlockTextures/.blockeditor-icon-backups/${path.basename(buildIconPath(iconId))}`);
}

function errorStatus(error: unknown, fallback: number): number {
  return error instanceof FileConflictError ? 409 : error instanceof AssetError ? error.status : fallback;
}

// =============================================================================
// Tile position helper
// =============================================================================

/**
 * Compute the pixel column and row of a tile in the composite atlas.
 *
 * @param {number} tileId Atlas tile ID (0–2047).
 * @returns {{ col: number; row: number }} Tile grid coordinates within the composite.
 */
function tilePosition(tileId: number): { col: number; row: number } {
  const page    = Math.floor(tileId / PAGE_TILES);
  const local   = tileId % PAGE_TILES;
  const pageCol = page % PAGE_GRID_COLS;
  const pageRow = Math.floor(page / PAGE_GRID_COLS);
  return {
    col: pageCol * PAGE_TILE_COLS + (local % PAGE_TILE_COLS),
    row: pageRow * PAGE_TILE_ROWS + Math.floor(local / PAGE_TILE_COLS),
  };
}

// =============================================================================
// Router
// =============================================================================
/**
 * Express router for atlas, tile, icon, and custom texture endpoints.
 *
 * The router layer performs HTTP parameter validation and response mapping while delegating filesystem, XML, image, and cache work to local helper functions. Keeping the boundary documented makes production API behaviour easier to audit.
 */

export const texturesRouter = Router();
texturesRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

/**
 * GET /api/textures/packs?size=<size>
 * List all texture packs with their available resolutions.
 * Optionally filters by a specific resolution via the `size` query parameter.
 */
texturesRouter.get('/packs', (req: Request, res: Response) => {
  try {
    const size = req.query.size === undefined ? undefined : parseSize(req.query.size);
    res.json({ packs: listTexturePacks(size) });
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/textures/info?size=&pack=&map=
 * Return metadata about the composite atlas (dimensions, page count, available files).
 * Returns 404 if no atlas pages exist for the requested pack/size/map.
 */
texturesRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const size    = parseSize(req.query.size);
    const pack    = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);

    const pagePaths      = getAtlasPagePaths(size, pack, mapKind);
    const availablePages = pagePaths.filter(p => fs.existsSync(p));

    if (availablePages.length === 0) {
      return void res.status(404).json({
        error: `No ${mapKind} atlas pages found for texture pack: ${pack}`,
      });
    }

    res.json({
      pack,
      map:     mapKind,
      paths:   availablePages,
      width:   ATLAS_COLS * size,
      height:  ATLAS_ROWS * size,
      tileSize: size,
      cols:    ATLAS_COLS,
      rows:    ATLAS_ROWS,
      total:   TOTAL_TILES,
      pages:   pagePaths.length,
    });
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/textures/atlas?size=&pack=&map=
 * Serve the composite atlas PNG.
 * `Cache-Control: no-store` ensures clients always fetch the latest version
 * after a custom atlas import.
 */
texturesRouter.get('/atlas', async (req: Request, res: Response) => {
  try {
    const size    = parseSize(req.query.size);
    const pack    = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const atlas   = await getCompositeAtlasBuffer(size, pack, mapKind);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(atlas);
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/textures/icons/sheet/:layer
 * Serve a raw build-icons sprite sheet PNG by layer index.
 * Used by the IconPicker to render the full icon grid on a canvas.
 */
texturesRouter.get('/icons/sheet/:layer', async (req: Request, res: Response) => {
  try {
    const layer = Number(req.params.layer);
    if (!Number.isInteger(layer) || layer < 0) {
      return void res.status(400).json({ error: `Invalid icon sheet layer: ${req.params.layer}` });
    }

    const sheetPath = buildIconPath(layer * 256);

    if (!fs.existsSync(sheetPath)) {
      return void res.status(404).json({ error: `Build icon sheet not found: ${layer}` });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(sheetPath);
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

// Express raw body parser for binary image uploads (up to 64 MB).
const rawImage = express.raw({
  type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'],
  limit: '64mb',
});

/**
 * PUT /api/textures/custom-atlas?size=&map=
 * Replace the entire custom texture atlas page with an uploaded image.
 * The image must be exactly `PAGE_TILE_COLS × size` pixels square.
 * Clears the atlas buffer cache on success.
 */
texturesRouter.put('/custom-atlas', rawImage, async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: 'Missing image payload.' });
    }
    const size    = parseSize(req.query.size);
    const mapKind = parseMapKind(req.query.map);
    await writeCustomAtlas(size, mapKind, req.body);
    res.json({ ok: true, size, map: mapKind });
  } catch (e) {
    res.status(errorStatus(e, 400)).json({ error: (e as Error).message });
  }
});

/**
 * PUT /api/textures/custom-tile/:id?size=&map=
 * Replace a single tile in the custom atlas.
 * `:id` may be a local slot (0–255) or an absolute custom tile ID (1792–2047).
 * Clears the atlas buffer cache on success.
 */
texturesRouter.put('/custom-tile/:id', rawImage, async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: 'Missing image payload.' });
    }
    const tileId  = Number(req.params.id);
    const size    = parseSize(req.query.size);
    const mapKind = parseMapKind(req.query.map);

    if (!Number.isInteger(tileId)) {
      return void res.status(400).json({ error: `Invalid tile ID: ${req.params.id}` });
    }

    await writeCustomTile(tileId, size, mapKind, req.body);

    // Always return the absolute custom tile ID in the response.
    const customTileId = tileId >= PAGE_TILES * 7 ? tileId : PAGE_TILES * 7 + tileId;
    res.json({ ok: true, tileId: customTileId, size, map: mapKind });
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

/**
 * PUT /api/textures/icon/:id
 * Replace a single icon slot in the build-icons sprite sheet.
 * The uploaded image is scaled to 64×64 px with transparent padding.
 * Clears the icon buffer cache on success.
 */
texturesRouter.put('/icon/:id', rawImage, async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: 'Missing image payload.' });
    }
    const iconId = Number(req.params.id);
    if (!Number.isInteger(iconId) || iconId < 0) {
      return void res.status(400).json({ error: `Invalid icon ID: ${req.params.id}` });
    }
    await writeBuildIcon(iconId, req.body);
    res.json({ ok: true, iconId });
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/textures/icon/:id
 * Return a single 64×64 icon PNG extracted from the build-icons sheet.
 * Used by the block card image tags and the icon preview button.
 */
texturesRouter.get('/icon/:id', async (req: Request, res: Response) => {
  try {
    const iconId = Number(req.params.id);
    if (!Number.isInteger(iconId) || iconId < 0) {
      return void res.status(400).json({ error: `Invalid icon ID: ${req.params.id}` });
    }
    const icon = await getBuildIcon(iconId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(icon);
  } catch (e) {
    res.status(errorStatus(e, 404)).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/textures/tile/:id?size=&pack=&map=
 * Extract and return a single atlas tile as a PNG.
 * Useful for debugging or tile-level inspection.
 * `:id` must be in the range 0–(TOTAL_TILES-1).
 */
texturesRouter.get('/tile/:id', async (req: Request, res: Response) => {
  try {
    const size    = parseSize(req.query.size);
    const pack    = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const tileId  = Number(req.params.id);

    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= TOTAL_TILES) {
      return void res.status(400).json({
        error: `Invalid tile ID: ${tileId}. Must be 0–${TOTAL_TILES - 1}.`,
      });
    }

    const atlas        = await getCompositeAtlasBuffer(size, pack, mapKind);
    const { col, row } = tilePosition(tileId);

    const tile = await sharp(atlas)
      .extract({ left: col * size, top: row * size, width: size, height: size })
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(tile);
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/textures/atlas-base64?size=&pack=&map=
 * Return the composite atlas as a base64-encoded data URL.
 * Useful for client contexts where a direct URL cannot be used.
 */
texturesRouter.get('/atlas-base64', async (req: Request, res: Response) => {
  try {
    const size    = parseSize(req.query.size);
    const pack    = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const atlas   = await getCompositeAtlasBuffer(size, pack, mapKind);
    res.json({
      data: `data:image/png;base64,${atlas.toString('base64')}`,
      tileSize: size,
      pack,
      map: mapKind,
    });
  } catch (e) {
    res.status(errorStatus(e, 500)).json({ error: (e as Error).message });
  }
});


/** GET /api/textures/icon/:id/status reports whether the initial icon can be restored. */
texturesRouter.get('/icon/:id/status', (req, res) => {
  try {
    const iconId = Number(req.params.id);
    if (!Number.isInteger(iconId) || iconId < 0) throw new AssetError('Invalid icon ID.');
    res.json({ canRestore: fs.existsSync(iconBackupPath(iconId)), writesGameFile: true });
  } catch (e) { res.status(errorStatus(e, 500)).json({ error: (e as Error).message }); }
});

/** POST /api/textures/icon/:id/restore restores a single original slot from the retained backup. */
texturesRouter.post('/icon/:id/restore', async (req, res) => {
  try {
    const iconId = Number(req.params.id);
    if (!Number.isInteger(iconId) || iconId < 0) throw new AssetError('Invalid icon ID.');
    const backup = iconBackupPath(iconId);
    if (!fs.existsSync(backup)) throw new AssetError('No original icon backup exists.', 404);
    const iconPath = buildIconPath(iconId);
    const expectedRevision = fileRevision(iconPath);
    const local = iconId % 256;
    const left = (local % 16) * 64;
    const top = Math.floor(local / 16) * 64;
    const original = await sharp(backup).extract({ left, top, width: 64, height: 64 }).png().toBuffer();
    const restored = await replacePixels(fs.readFileSync(iconPath), original, left, top);
    atomicWriteFile(iconPath, restored, { expectedRevision });
    iconBufferCache.clear();
    res.json({ ok: true, iconId });
  } catch (e) { res.status(errorStatus(e, 500)).json({ error: (e as Error).message }); }
});
