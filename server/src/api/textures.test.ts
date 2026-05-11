import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import { parseMapKind, parsePack, parseSize, texturesRouter } from './textures.js';

describe('texture API parsing helpers', () => {
  it('accepts only valid StarMade texture sizes', () => {
    expect(parseSize('64')).toBe(64);
    expect(parseSize('128')).toBe(128);
    expect(parseSize('256')).toBe(256);
    expect(parseSize('512')).toBe(256);
    expect(parseSize('bad')).toBe(256);
  });

  it('sanitizes texture pack names to avoid path traversal', () => {
    expect(parsePack('Default')).toBe('Default');
    expect(parsePack('..\\evil/pack')).toBe('..evilpack');
    expect(parsePack('')).toBe('Default');
  });

  it('normalizes map kind values', () => {
    expect(parseMapKind('normal')).toBe('normal');
    expect(parseMapKind('NORMAL')).toBe('normal');
    expect(parseMapKind('diffuse')).toBe('diffuse');
    expect(parseMapKind('anything')).toBe('diffuse');
  });
});

describe('texture API routes', () => {
  const originalCwd = process.cwd();
  let tmp: string;
  let game: string;
  let app: express.Express;

  async function png(width: number, height: number, background: sharp.Color): Promise<Buffer> {
    return sharp({ create: { width, height, channels: 4, background } }).png().toBuffer();
  }

  async function writeFixtures(pack = 'Pack'): Promise<void> {
    game = path.join(tmp, 'StarMade');
    const packDir = path.join(game, 'data', 'textures', 'block', pack, '64');
    const customDir = path.join(game, 'customBlockTextures', '64');
    const imageDir = path.join(game, 'data', 'image-resource');
    fs.mkdirSync(packDir, { recursive: true });
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(imageDir, { recursive: true });

    const pages = [
      ['t000.png', { r: 255, g: 0, b: 0, alpha: 1 }],
      ['t001.png', { r: 0, g: 255, b: 0, alpha: 1 }],
      ['t002.png', { r: 0, g: 0, b: 255, alpha: 1 }],
      ['t003.png', { r: 255, g: 255, b: 0, alpha: 1 }],
    ] as const;
    for (const [name, color] of pages) fs.writeFileSync(path.join(packDir, name), await png(1024, 1024, color));
    fs.writeFileSync(path.join(customDir, 'custom.png'), await png(1024, 1024, { r: 0, g: 0, b: 0, alpha: 0 }));
    fs.writeFileSync(path.join(imageDir, 'build-icons-00-16x16-gui-.png'), await png(1024, 1024, { r: 200, g: 100, b: 50, alpha: 1 }));
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: game, worldDir: 'world0', atlasSize: 64, texturePack: pack }), 'utf8');
  }

  beforeEach(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-textures-'));
    process.chdir(tmp);
    await writeFixtures();
    app = express();
    app.use('/textures', texturesRouter);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('lists packs, reports atlas info, serves atlas images and extracts tiles', async () => {
    await request(app)
      .get('/textures/packs')
      .query({ size: 64 })
      .expect(200)
      .expect(res => expect(res.body.packs).toContainEqual({ name: 'Pack', sizes: [64] }));

    await request(app)
      .get('/textures/info')
      .query({ size: 64, pack: 'Pack' })
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({ pack: 'Pack', map: 'diffuse', width: 4096, height: 2048, tileSize: 64, cols: 64, rows: 32, total: 2048, pages: 8 });
        expect(res.body.paths.length).toBe(5);
      });

    await request(app)
      .get('/textures/atlas')
      .query({ size: 64, pack: 'Pack' })
      .expect('Content-Type', /image\/png/)
      .expect(200)
      .expect(res => expect(res.body.length).toBeGreaterThan(100));

    await request(app)
      .get('/textures/tile/1792')
      .query({ size: 64, pack: 'Pack' })
      .expect('Content-Type', /image\/png/)
      .expect(200)
      .expect(res => expect(res.body.length).toBeGreaterThan(50));

    await request(app).get('/textures/tile/bad').expect(400);
    await request(app).get('/textures/tile/99999').expect(400);
  });

  it('imports full custom atlases and individual tiles with validation', async () => {
    const fullAtlas = await png(1024, 1024, { r: 10, g: 20, b: 30, alpha: 1 });
    const tile = await png(8, 8, { r: 100, g: 150, b: 200, alpha: 1 });

    await request(app)
      .put('/textures/custom-atlas')
      .query({ size: 64 })
      .set('Content-Type', 'image/png')
      .send(Buffer.alloc(0))
      .expect(400)
      .expect(res => expect(res.body.error).toBe('Missing image payload.'));

    await request(app)
      .put('/textures/custom-atlas')
      .query({ size: 64, map: 'normal' })
      .set('Content-Type', 'image/png')
      .send(await png(16, 16, { r: 0, g: 0, b: 0, alpha: 1 }))
      .expect(400)
      .expect(res => expect(res.body.error).toContain('Invalid custom atlas size'));

    await request(app)
      .put('/textures/custom-atlas')
      .query({ size: 64 })
      .set('Content-Type', 'image/png')
      .send(fullAtlas)
      .expect(200)
      .expect(res => expect(res.body).toEqual({ ok: true, size: 64, map: 'diffuse' }));

    await request(app)
      .put('/textures/custom-tile/0')
      .query({ size: 64 })
      .set('Content-Type', 'image/png')
      .send(tile)
      .expect(200)
      .expect(res => expect(res.body).toEqual({ ok: true, tileId: 1792, size: 64, map: 'diffuse' }));

    await request(app)
      .put('/textures/custom-tile/not-a-number')
      .query({ size: 64 })
      .set('Content-Type', 'image/png')
      .send(tile)
      .expect(400);
  });

  it('serves and updates build icon sheets/icons with defensive errors', async () => {
    const icon = await png(32, 32, { r: 1, g: 2, b: 3, alpha: 1 });

    await request(app)
      .get('/textures/icons/sheet/0')
      .expect('Content-Type', /image\/png/)
      .expect(200);
    await request(app).get('/textures/icons/sheet/-1').expect(400);
    await request(app).get('/textures/icons/sheet/99').expect(404);

    await request(app)
      .get('/textures/icon/0')
      .expect('Content-Type', /image\/png/)
      .expect(200)
      .expect(res => expect(res.body.length).toBeGreaterThan(50));
    await request(app).get('/textures/icon/bad').expect(400);
    await request(app).get('/textures/icon/9999').expect(404);

    await request(app)
      .put('/textures/icon/0')
      .set('Content-Type', 'image/png')
      .send(icon)
      .expect(200)
      .expect(res => expect(res.body).toEqual({ ok: true, iconId: 0 }));
    await request(app)
      .put('/textures/icon/bad')
      .set('Content-Type', 'image/png')
      .send(icon)
      .expect(400);
  });

  it('returns useful errors when configuration or atlas pages are missing', async () => {
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: path.join(tmp, 'missing') }), 'utf8');
    await request(app).get('/textures/packs').expect(200).expect(res => expect(res.body.packs).toEqual([]));

    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: game }), 'utf8');
    await request(app)
      .get('/textures/info')
      .query({ size: 64, pack: 'MissingPack', map: 'normal' })
      .expect(404)
      .expect(res => expect(res.body.error).toContain('No normal atlas pages found'));

    await request(app)
      .get('/textures/atlas')
      .query({ size: 64, pack: 'MissingPack', map: 'normal' })
      .expect(500)
      .expect(res => expect(res.body.error).toContain('No normal texture pages found'));
  });
});
