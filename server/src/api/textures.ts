/**
 * @fileoverview Texture atlas API router.
 *
 * Serves StarMade block texture packs from:
 * `data/textures/block/<texturePack>/<size>/t000.png`, `t001.png`, `t002.png`,
 * plus the custom atlas `customBlockTextures/<size>/custom.png`.
 *
 * Also supports normal maps:
 * `t000_NRM.png`, `t001_NRM.png`, `t002_NRM.png`, `custom_NRM.png`.
 *
 * Tile ID mapping follows the engine/editor:
 *  -    0..255  → t000
 *  -  256..511  → t001
 *  -  512..767  → t002
 *  -  768..1023 → t003
 *  - 1792..2047 → custom.png
 *
 * The exposed atlas is a 64×32 composite grid (8 layers arranged in 4×2).
 */

import express, { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { resolveStarmadeRoot } from '../utils/path.js';

const VALID_SIZES = [64, 128, 256] as const;
type TileSize = typeof VALID_SIZES[number];
type TextureMapKind = 'diffuse' | 'normal';

const PAGE_TILE_COLS = 16;
const PAGE_TILE_ROWS = 16;
const PAGE_TILES = PAGE_TILE_COLS * PAGE_TILE_ROWS;
const PAGE_GRID_COLS = 4;
const PAGE_GRID_ROWS = 2;
const PAGE_COUNT = PAGE_GRID_COLS * PAGE_GRID_ROWS;
const ATLAS_COLS = PAGE_TILE_COLS * PAGE_GRID_COLS;
const ATLAS_ROWS = PAGE_TILE_ROWS * PAGE_GRID_ROWS;
const TOTAL_TILES = PAGE_TILES * PAGE_COUNT;

const atlasBufferCache = new Map<string, Promise<Buffer>>();
const iconBufferCache = new Map<number, Promise<Buffer>>();

function getStarmadeDir(): string {
  const p = path.resolve(process.cwd(), 'SMToolConfig.json');
  if (!fs.existsSync(p)) throw new Error('SMToolConfig.json missing.');
  return resolveStarmadeRoot((JSON.parse(fs.readFileSync(p, 'utf8')) as { starmadeDir: string }).starmadeDir);
}

export function parseSize(raw: unknown): TileSize {
  const n = parseInt(String(raw), 10);
  return (VALID_SIZES as readonly number[]).includes(n) ? (n as TileSize) : 256;
}

export function parsePack(raw: unknown): string {
  const value = String(raw ?? 'Default').trim() || 'Default';
  return value.replace(/[\\/]/g, '');
}

export function parseMapKind(raw: unknown): TextureMapKind {
  return String(raw ?? 'diffuse').trim().toLowerCase() === 'normal' ? 'normal' : 'diffuse';
}

function getTexturePackDir(pack: string, size: TileSize): string {
  return path.join(getStarmadeDir(), 'data', 'textures', 'block', pack, String(size));
}

function getAtlasPagePaths(size: TileSize, pack: string, mapKind: TextureMapKind): string[] {
  const dir = getStarmadeDir();
  const packBase = getTexturePackDir(pack, size);
  const suffix = mapKind === 'normal' ? '_NRM' : '';
  const customName = mapKind === 'normal' ? 'custom_NRM.png' : 'custom.png';
  const customPath = path.join(dir, 'customBlockTextures', String(size), customName);

  return [
    path.join(packBase, `t000${suffix}.png`),
    path.join(packBase, `t001${suffix}.png`),
    path.join(packBase, `t002${suffix}.png`),
    path.join(packBase, `t003${suffix}.png`),
    '',
    '',
    '',
    customPath,
  ];
}

function listTexturePacks(size?: TileSize): Array<{ name: string; sizes: number[] }> {
  const base = path.join(getStarmadeDir(), 'data', 'textures', 'block');
  if (!fs.existsSync(base)) return [];

  return fs.readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const packDir = path.join(base, entry.name);
      const sizes = VALID_SIZES.filter(s => fs.existsSync(path.join(packDir, String(s), 't000.png')));
      return { name: entry.name, sizes: [...sizes] };
    })
    .filter(pack => pack.sizes.length > 0)
    .filter(pack => size === undefined || pack.sizes.includes(size));
}

async function buildCompositeAtlas(size: TileSize, pack: string, mapKind: TextureMapKind): Promise<Buffer> {
  const pageSizePx = PAGE_TILE_COLS * size;
  const width = ATLAS_COLS * size;
  const height = ATLAS_ROWS * size;
  const pagePaths = getAtlasPagePaths(size, pack, mapKind);
  const composites: sharp.OverlayOptions[] = [];

  for (let pageIndex = 0; pageIndex < pagePaths.length; pageIndex++) {
    const pagePath = pagePaths[pageIndex];
    if (!fs.existsSync(pagePath)) continue;

    const pageCol = pageIndex % PAGE_GRID_COLS;
    const pageRow = Math.floor(pageIndex / PAGE_GRID_COLS);
    composites.push({
      input: pagePath,
      left: pageCol * pageSizePx,
      top: pageRow * pageSizePx,
    });
  }

  if (composites.length === 0) {
    throw new Error(`No ${mapKind} texture pages found for pack "${pack}" at size ${size}.`);
  }

  const background = mapKind === 'normal'
    ? { r: 128, g: 128, b: 255, alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background,
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

function getCompositeAtlasBuffer(size: TileSize, pack: string, mapKind: TextureMapKind): Promise<Buffer> {
  const key = `${pack}:${size}:${mapKind}`;
  let pending = atlasBufferCache.get(key);
  if (!pending) {
    pending = buildCompositeAtlas(size, pack, mapKind);
    atlasBufferCache.set(key, pending);
  }
  return pending;
}

function buildIconPath(iconId: number): string {
  const layer = Math.floor(iconId / 256);
  return path.join(getStarmadeDir(), 'data', 'image-resource', `build-icons-${String(layer).padStart(2, '0')}-16x16-gui-.png`);
}

async function getBuildIcon(iconId: number): Promise<Buffer> {
  let pending = iconBufferCache.get(iconId);
  if (!pending) {
    pending = (async () => {
      const iconPath = buildIconPath(iconId);
      if (!fs.existsSync(iconPath)) throw new Error(`Build icon sheet not found for icon ${iconId}.`);

      // Engine mapping: buildIconNum / 256 selects the sheet, buildIconNum % 256
      // selects a 16x16 multisprite slot. The PNG sheets are 1024x1024, so one
      // multisprite slot is 64x64 pixels.
      const local = iconId % 256;
      const iconSize = 64;
      const col = local % 16;
      const row = Math.floor(local / 16);
      return sharp(iconPath)
        .extract({ left: col * iconSize, top: row * iconSize, width: iconSize, height: iconSize })
        .png()
        .toBuffer();
    })();
    iconBufferCache.set(iconId, pending);
  }
  return pending;
}

async function ensureCustomAtlas(size: TileSize, mapKind: TextureMapKind): Promise<string> {
  const customName = mapKind === 'normal' ? 'custom_NRM.png' : 'custom.png';
  const customPath = path.join(getStarmadeDir(), 'customBlockTextures', String(size), customName);
  if (!fs.existsSync(customPath)) {
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    const background = mapKind === 'normal'
      ? { r: 128, g: 128, b: 255, alpha: 1 }
      : { r: 0, g: 0, b: 0, alpha: 0 };
    await sharp({
      create: {
        width: PAGE_TILE_COLS * size,
        height: PAGE_TILE_ROWS * size,
        channels: 4,
        background,
      },
    }).png().toFile(customPath);
  }
  return customPath;
}

async function writeCustomAtlas(size: TileSize, mapKind: TextureMapKind, input: Buffer): Promise<void> {
  const expected = PAGE_TILE_COLS * size;
  const metadata = await sharp(input).metadata();
  if (metadata.width !== expected || metadata.height !== expected) {
    throw new Error(`Invalid custom atlas size. Expected ${expected}×${expected}px (${PAGE_TILE_COLS}×${PAGE_TILE_ROWS} tiles at ${size}px), got ${metadata.width ?? '?'}×${metadata.height ?? '?'}px.`);
  }

  const customPath = await ensureCustomAtlas(size, mapKind);
  const normalized = await sharp(input).png().toBuffer();
  fs.writeFileSync(customPath, normalized);
  atlasBufferCache.clear();
}

async function writeCustomTile(tileId: number, size: TileSize, mapKind: TextureMapKind, input: Buffer): Promise<void> {
  const local = tileId >= PAGE_TILES * 7 ? tileId - PAGE_TILES * 7 : tileId;
  if (local < 0 || local >= PAGE_TILES) {
    throw new Error(`Custom tile target must be 0–255 or 1792–2047. Received: ${tileId}`);
  }

  const customPath = await ensureCustomAtlas(size, mapKind);
  const tile = await sharp(input)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer();
  const col = local % PAGE_TILE_COLS;
  const row = Math.floor(local / PAGE_TILE_COLS);
  const updated = await sharp(customPath)
    .composite([{ input: tile, left: col * size, top: row * size }])
    .png()
    .toBuffer();
  fs.writeFileSync(customPath, updated);
  atlasBufferCache.clear();
}

async function writeBuildIcon(iconId: number, input: Buffer): Promise<void> {
  const iconPath = buildIconPath(iconId);
  if (!fs.existsSync(iconPath)) throw new Error(`Build icon sheet not found for icon ${iconId}.`);

  const icon = await sharp(input)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const local = iconId % 256;
  const col = local % 16;
  const row = Math.floor(local / 16);
  const updated = await sharp(iconPath)
    .composite([{ input: icon, left: col * 64, top: row * 64 }])
    .png()
    .toBuffer();
  fs.writeFileSync(iconPath, updated);
  iconBufferCache.clear();
}

function tilePosition(tileId: number): { col: number; row: number } {
  const page = Math.floor(tileId / PAGE_TILES);
  const local = tileId % PAGE_TILES;
  const pageCol = page % PAGE_GRID_COLS;
  const pageRow = Math.floor(page / PAGE_GRID_COLS);
  return {
    col: pageCol * PAGE_TILE_COLS + (local % PAGE_TILE_COLS),
    row: pageRow * PAGE_TILE_ROWS + Math.floor(local / PAGE_TILE_COLS),
  };
}

export const texturesRouter = Router();

texturesRouter.get('/packs', (req: Request, res: Response) => {
  try {
    const size = req.query.size === undefined ? undefined : parseSize(req.query.size);
    res.json({ packs: listTexturePacks(size) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

texturesRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const size = parseSize(req.query.size);
    const pack = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const pagePaths = getAtlasPagePaths(size, pack, mapKind);
    const availablePages = pagePaths.filter(p => fs.existsSync(p));
    if (availablePages.length === 0) {
      return void res.status(404).json({ error: `No ${mapKind} atlas pages found for texture pack: ${pack}` });
    }

    res.json({
      pack,
      map: mapKind,
      paths: availablePages,
      width: ATLAS_COLS * size,
      height: ATLAS_ROWS * size,
      tileSize: size,
      cols: ATLAS_COLS,
      rows: ATLAS_ROWS,
      total: TOTAL_TILES,
      pages: pagePaths.length,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

texturesRouter.get('/atlas', async (req: Request, res: Response) => {
  try {
    const size = parseSize(req.query.size);
    const pack = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const atlas = await getCompositeAtlasBuffer(size, pack, mapKind);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(atlas);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

texturesRouter.get('/icons/sheet/:layer', async (req: Request, res: Response) => {
  try {
    const layer = parseInt(req.params.layer, 10);
    if (isNaN(layer) || layer < 0) {
      return void res.status(400).json({ error: `Invalid icon sheet layer: ${req.params.layer}` });
    }

    const sheetPath = path.join(getStarmadeDir(), 'data', 'image-resource', `build-icons-${String(layer).padStart(2, '0')}-16x16-gui-.png`);
    if (!fs.existsSync(sheetPath)) {
      return void res.status(404).json({ error: `Build icon sheet not found: ${layer}` });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(sheetPath);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const rawImage = express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'], limit: '64mb' });

texturesRouter.put('/custom-atlas', rawImage, async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: 'Missing image payload.' });
    }
    const size = parseSize(req.query.size);
    const mapKind = parseMapKind(req.query.map);
    await writeCustomAtlas(size, mapKind, req.body);
    res.json({ ok: true, size, map: mapKind });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

texturesRouter.put('/custom-tile/:id', rawImage, async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: 'Missing image payload.' });
    }
    const tileId = parseInt(req.params.id, 10);
    const size = parseSize(req.query.size);
    const mapKind = parseMapKind(req.query.map);
    if (isNaN(tileId)) {
      return void res.status(400).json({ error: `Invalid tile ID: ${req.params.id}` });
    }
    await writeCustomTile(tileId, size, mapKind, req.body);
    const customTileId = tileId >= PAGE_TILES * 7 ? tileId : PAGE_TILES * 7 + tileId;
    res.json({ ok: true, tileId: customTileId, size, map: mapKind });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

texturesRouter.put('/icon/:id', rawImage, async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: 'Missing image payload.' });
    }
    const iconId = parseInt(req.params.id, 10);
    if (isNaN(iconId) || iconId < 0) {
      return void res.status(400).json({ error: `Invalid icon ID: ${req.params.id}` });
    }
    await writeBuildIcon(iconId, req.body);
    res.json({ ok: true, iconId });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

texturesRouter.get('/icon/:id', async (req: Request, res: Response) => {
  try {
    const iconId = parseInt(req.params.id, 10);
    if (isNaN(iconId) || iconId < 0) {
      return void res.status(400).json({ error: `Invalid icon ID: ${req.params.id}` });
    }

    const icon = await getBuildIcon(iconId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(icon);
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

texturesRouter.get('/tile/:id', async (req: Request, res: Response) => {
  try {
    const size = parseSize(req.query.size);
    const pack = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const tileId = parseInt(req.params.id, 10);

    if (isNaN(tileId) || tileId < 0 || tileId >= TOTAL_TILES) {
      return void res.status(400).json({ error: `Invalid tile ID: ${tileId}. Must be 0–${TOTAL_TILES - 1}.` });
    }

    const atlas = await getCompositeAtlasBuffer(size, pack, mapKind);
    const { col, row } = tilePosition(tileId);

    const tile = await sharp(atlas)
      .extract({ left: col * size, top: row * size, width: size, height: size })
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(tile);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

texturesRouter.get('/atlas-base64', async (req: Request, res: Response) => {
  try {
    const size = parseSize(req.query.size);
    const pack = parsePack(req.query.pack);
    const mapKind = parseMapKind(req.query.map);
    const atlas = await getCompositeAtlasBuffer(size, pack, mapKind);
    res.json({ data: `data:image/png;base64,${atlas.toString('base64')}`, tileSize: size, pack, map: mapKind });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
