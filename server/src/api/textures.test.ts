import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import sharp, { type Color } from 'sharp';
import * as blocksApi from './blocks.js';
import * as atomicFiles from '../services/atomicFile.js';
import { parseMapKind, parsePack, parseSize, texturesRouter, warmAtlasCache, warmIconCache } from './textures.js';

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

  async function png(width: number, height: number, background: Color): Promise<Buffer> {
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
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
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

  it('preserves exact material alpha in composite atlases and refreshes after external edits', async () => {
    const normal = path.join(game, 'data/textures/block/Pack/64/t000_NRM.png');
    fs.writeFileSync(normal, await png(1024, 1024, { r: 20, g: 30, b: 40, alpha: 64 / 255 }));
    const url = '/textures/tile/0?size=64&pack=Pack&map=normal';
    const first = await request(app).get(url).expect(200);
    expect([...await sharp(first.body).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()]).toEqual([20, 30, 40, 64]);
    fs.writeFileSync(normal, await png(1024, 1024, { r: 50, g: 60, b: 70, alpha: 100 / 255 }));
    const changed = await request(app).get(url).expect(200);
    expect([...await sharp(changed.body).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()]).toEqual([50, 60, 70, 100]);
    fs.writeFileSync(normal, await png(1024, 1024, { r: 128, g: 128, b: 255, alpha: 0 }));
    const zeroAlpha = await request(app).get(url).expect(200);
    expect([...await sharp(zeroAlpha.body).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()]).toEqual([128, 128, 255, 0]);
  });

  it('refreshes atlas and icon caches when the configured installation changes', async () => {
    const before = await request(app).get('/textures/icon/0').expect(200);
    const atlasBefore = await request(app).get('/textures/tile/0?size=64&pack=Pack').expect(200);
    const other = path.join(tmp, 'other'); fs.cpSync(game, other, { recursive: true });
    fs.writeFileSync(path.join(other, 'data/image-resource/build-icons-00-16x16-gui-.png'), await png(1024, 1024, { r: 1, g: 2, b: 3, alpha: 1 }));
    fs.writeFileSync(path.join(other, 'data/textures/block/Pack/64/t000.png'), await png(1024, 1024, { r: 4, g: 5, b: 6, alpha: 1 }));
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: other }));
    const after = await request(app).get('/textures/icon/0').expect(200);
    const atlasAfter = await request(app).get('/textures/tile/0?size=64&pack=Pack').expect(200);
    expect(after.body).not.toEqual(before.body); expect(atlasAfter.body).not.toEqual(atlasBefore.body);
  });

  it('backs up original icon sheets and restores only the selected original slot', async () => {
    await request(app).get('/textures/icon/0/status').expect(200).expect(res => expect(res.body).toEqual({ canRestore: false, writesGameFile: true }));
    const original = (await request(app).get('/textures/icon/0')).body;
    const upload = await png(64, 64, { r: 1, g: 2, b: 3, alpha: 0.25 });
    await request(app).put('/textures/icon/0').set('Content-Type', 'image/png').send(upload).expect(200);
    await request(app).put('/textures/icon/1').set('Content-Type', 'image/png').send(upload).expect(200);
    const second = (await request(app).get('/textures/icon/1')).body;
    await request(app).get('/textures/icon/0/status').expect(200).expect(res => expect(res.body.canRestore).toBe(true));
    await request(app).post('/textures/icon/0/restore').expect(200).expect(res => expect(res.body).toEqual({ ok: true, iconId: 0 }));
    expect((await request(app).get('/textures/icon/0')).body).toEqual(original);
    expect((await request(app).get('/textures/icon/1')).body).toEqual(second);
    await request(app).post('/textures/icon/256/restore').expect(404);
    await request(app).post('/textures/icon/bad/restore').expect(400);
  });

  it('replaces transparent custom tile pixels rather than blending with their previous contents', async () => {
    const red = await png(64, 64, { r: 100, g: 0, b: 0, alpha: 1 });
    const normal = await png(64, 64, { r: 20, g: 30, b: 40, alpha: 64 / 255 });
    await request(app).put('/textures/custom-tile/0?size=64&map=normal').set('Content-Type', 'image/png').send(red).expect(200);
    await request(app).put('/textures/custom-tile/0?size=64&map=normal').set('Content-Type', 'image/png').send(normal).expect(200);
    const result = await request(app).get('/textures/tile/1792?size=64&pack=Pack&map=normal').expect(200);
    expect([...await sharp(result.body).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()]).toEqual([20, 30, 40, 64]);
  });


  it('warms native atlases and batches icon successes and failures without hiding missing resources', async () => {
    fs.writeFileSync(path.join(game, 'data/textures/block/Pack/64/t000_NRM.png'), await png(1024, 1024, { r: 128, g: 128, b: 255, alpha: 0 }));
    expect(await warmAtlasCache()).toMatchObject({ pack: 'Pack', size: 64, diffuseBytes: expect.any(Number), normalBytes: expect.any(Number) });
    vi.spyOn(blocksApi, 'getBlockIconIds').mockReturnValue([...Array.from({ length: 25 }, (_, i) => i), 256]);
    expect(await warmIconCache()).toEqual({ icons: 25, sheets: 2, failed: 1 });
    await request(app).get('/textures/icon/0').expect(200).expect('Cache-Control', 'no-store');
    await request(app).get('/textures/icon/0').expect(200);
    const response = await request(app).get('/textures/atlas-base64?size=64&pack=Pack').expect(200).expect('Cache-Control', 'no-store');
    expect(response.body).toMatchObject({ tileSize: 64, pack: 'Pack', map: 'diffuse' });
    expect(await sharp(Buffer.from(response.body.data.split(',')[1], 'base64')).metadata()).toMatchObject({ width: 4096, height: 2048 });
  });

  it('rejects missing configuration consistently and never treats cwd as the installation', async () => {
    fs.unlinkSync(path.join(tmp, 'SMToolConfig.json'));
    for (const url of ['/packs', '/info', '/icons/sheet/0', '/tile/0', '/atlas-base64']) {
      await request(app).get('/textures' + url).expect(500).expect(res => expect(res.body.error).toContain('missing'));
    }
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), '{}');
    await request(app).get('/textures/packs').expect(503);
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: game }));
    fs.rmSync(path.join(game, 'data/textures/block'), { recursive: true });
    await request(app).get('/textures/packs').expect(200).expect(res => expect(res.body.packs).toEqual([]));
  });

  it('validates native page dimensions, rejects bad imports and creates only a requested custom page', async () => {
    fs.writeFileSync(path.join(game, 'data/textures/block/Pack/64/t000.png'), await png(1, 1, { r: 1, g: 2, b: 3, alpha: 1 }));
    await request(app).get('/textures/atlas?size=64&pack=Pack').expect(400).expect(res => expect(res.body.error).toContain('dimensions'));
    const tile = await png(8, 8, { r: 10, g: 20, b: 30, alpha: 0.5 });
    fs.unlinkSync(path.join(game, 'customBlockTextures/64/custom.png'));
    await request(app).put('/textures/custom-tile/1792?size=64').set('Content-Type', 'image/png').send(tile).expect(200).expect(res => expect(res.body.tileId).toBe(1792));
    for (const id of ['-1', '256', '2048']) await request(app).put('/textures/custom-tile/' + id).set('Content-Type', 'image/png').send(tile).expect(400);
    for (const url of ['/custom-tile/0', '/icon/0']) {
      await request(app).put('/textures' + url).expect(400);
      await request(app).put('/textures' + url).set('Content-Type', 'image/png').send(Buffer.alloc(0)).expect(400);
    }
    await request(app).put('/textures/icon/256').set('Content-Type', 'image/png').send(tile).expect(500);
    for (const url of ['/icon/bad/status', '/icon/-1/status']) await request(app).get('/textures' + url).expect(400);
    await request(app).get('/textures/icon/0/status').expect('Cache-Control', 'no-store').expect(200);
    await request(app).post('/textures/icon/-1/restore').expect('Cache-Control', 'no-store').expect(400);
  });

  it('returns a conflict without replacing image bytes when an atomic write detects an external edit', async () => {
    const target = path.join(game, 'customBlockTextures/64/custom.png');
    const original = fs.readFileSync(target);
    vi.spyOn(atomicFiles, 'atomicWriteFile').mockImplementation(() => { throw new atomicFiles.FileConflictError(); });
    await request(app).put('/textures/custom-atlas?size=64').set('Content-Type', 'image/png').send(await png(1024, 1024, { r: 30, g: 40, b: 50, alpha: 1 })).expect(409);
    expect(fs.readFileSync(target)).toEqual(original);
  });


  it('honors the fixed preview installation for reads and imports even when the settings file names another root', async () => {
    const isolated = path.join(tmp, 'isolated'); fs.cpSync(game, isolated, { recursive: true });
    const original = fs.readFileSync(path.join(game, 'customBlockTextures/64/custom.png'));
    vi.stubEnv('EDITOR_FIXED_STARMADE_DIR', isolated);
    const image = await png(1024, 1024, { r: 9, g: 8, b: 7, alpha: 1 });
    await request(app).put('/textures/custom-atlas?size=64').set('Content-Type', 'image/png').send(image).expect(200);
    expect(fs.readFileSync(path.join(game, 'customBlockTextures/64/custom.png'))).toEqual(original);
    expect(fs.readFileSync(path.join(isolated, 'customBlockTextures/64/custom.png'))).not.toEqual(original);
    fs.unlinkSync(path.join(tmp, 'SMToolConfig.json'));
    await request(app).get('/textures/icon/0').expect(200);
  });

});
