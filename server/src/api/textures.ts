/**
 * @fileoverview Texture atlas API router.
 *
 * Serves the StarMade block texture atlas and individual tile extractions.
 *
 * Endpoints:
 *  GET /api/textures/atlas?size=256       — full atlas PNG (customBlockTextures/<size>/custom.png)
 *  GET /api/textures/tile/:id?size=256    — single tile extracted from atlas (PNG)
 *  GET /api/textures/info?size=256        — atlas metadata (width, height, cols, rows, tileSize)
 *
 * The atlas is a 16×16 grid of tiles. Each tile ID = row*16 + col.
 * Supported sizes: 64, 128, 256.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/** Supported texture atlas tile sizes in pixels. */
const VALID_SIZES = [64, 128, 256] as const;
type TileSize = typeof VALID_SIZES[number];

/** Number of tiles per row/column in the atlas grid. */
const ATLAS_COLS = 16;
const ATLAS_ROWS = 16;

/**
 * Load starmadeDir from SMToolConfig.json.
 *
 * @returns {string} Absolute StarMade root path.
 */
function getStarmadeDir(): string {
  const p = path.resolve(process.cwd(), 'SMToolConfig.json');
  if (!fs.existsSync(p)) throw new Error('SMToolConfig.json missing.');
  return (JSON.parse(fs.readFileSync(p, 'utf8')) as { starmadeDir: string }).starmadeDir;
}

/**
 * Resolve the atlas PNG path for a given tile size.
 *
 * @param {TileSize} size Tile size in pixels.
 * @returns {string} Absolute path to custom.png.
 */
function getAtlasPath(size: TileSize): string {
  return path.join(getStarmadeDir(), 'customBlockTextures', String(size), 'custom.png');
}

/**
 * Parse and validate the size query parameter.
 *
 * @param {unknown} raw Raw query value.
 * @returns {TileSize} Validated tile size, defaulting to 256.
 */
function parseSize(raw: unknown): TileSize {
  const n = parseInt(String(raw), 10);
  return (VALID_SIZES as readonly number[]).includes(n) ? (n as TileSize) : 256;
}

export const texturesRouter = Router();

/** GET /api/textures/info — atlas dimensions and tile count */
texturesRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const size     = parseSize(req.query.size);
    const atlasPath = getAtlasPath(size);
    if (!fs.existsSync(atlasPath)) {
      return void res.status(404).json({ error: `Atlas not found: ${atlasPath}` });
    }
    const meta = await sharp(atlasPath).metadata();
    res.json({
      path:     atlasPath,
      width:    meta.width,
      height:   meta.height,
      tileSize: size,
      cols:     ATLAS_COLS,
      rows:     ATLAS_ROWS,
      total:    ATLAS_COLS * ATLAS_ROWS,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/textures/atlas?size=256 — serve full atlas PNG */
texturesRouter.get('/atlas', (req: Request, res: Response) => {
  try {
    const size      = parseSize(req.query.size);
    const atlasPath = getAtlasPath(size);
    if (!fs.existsSync(atlasPath)) {
      return void res.status(404).json({ error: `Atlas not found: ${atlasPath}` });
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(atlasPath).pipe(res);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/textures/tile/:id?size=256 — extract a single tile PNG */
texturesRouter.get('/tile/:id', async (req: Request, res: Response) => {
  try {
    const size      = parseSize(req.query.size);
    const atlasPath = getAtlasPath(size);
    const tileId    = parseInt(req.params.id, 10);

    if (!fs.existsSync(atlasPath)) {
      return void res.status(404).json({ error: `Atlas not found: ${atlasPath}` });
    }
    if (isNaN(tileId) || tileId < 0 || tileId >= ATLAS_COLS * ATLAS_ROWS) {
      return void res.status(400).json({ error: `Invalid tile ID: ${tileId}. Must be 0–${ATLAS_COLS * ATLAS_ROWS - 1}.` });
    }

    const col = tileId % ATLAS_COLS;
    const row = Math.floor(tileId / ATLAS_COLS);

    const tile = await sharp(atlasPath)
      .extract({
        left:   col * size,
        top:    row * size,
        width:  size,
        height: size,
      })
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(tile);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/textures/atlas-base64?size=64 — base64-encoded atlas (for Three.js TextureLoader) */
texturesRouter.get('/atlas-base64', (req: Request, res: Response) => {
  try {
    const size      = parseSize(req.query.size);
    const atlasPath = getAtlasPath(size);
    if (!fs.existsSync(atlasPath)) {
      return void res.status(404).json({ error: `Atlas not found: ${atlasPath}` });
    }
    const b64 = fs.readFileSync(atlasPath).toString('base64');
    res.json({ data: `data:image/png;base64,${b64}`, tileSize: size });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
