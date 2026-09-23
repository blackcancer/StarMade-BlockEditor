import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { assetsRouter } from './assets.js';
import { texturesRouter } from './textures.js';

describe('native render assets HTTP contract', () => {
  const cwd = process.cwd();
  let tmp: string;
  let game: string;
  let app: express.Express;
  async function write(relative: string, content: string | Buffer): Promise<void> {
    const file = path.join(game, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
  }
  beforeEach(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-assets-')); process.chdir(tmp);
    game = path.join(tmp, 'game'); fs.mkdirSync(game);
    fs.writeFileSync('SMToolConfig.json', JSON.stringify({ starmadeDir: game }));
    await write('data/config/BlockConfig.xml', '<Config/>');
    await write('data/shader/cube/cube.vert', '#IMPORT common.glsl\nvoid main(){}');
    await write('data/shader/common.glsl', '');
    await write('data/config/mainConfig.xml', '<Config><LOD><Rod relpath="Rod" filename="rod"/></LOD></Config>');
    await write('data/models/lod/Rod/rod.scene', '<scene/>');
    await write('data/models/lod/Rod/rod.material', 'material Rod {}');
    const image = await sharp(Buffer.from([20, 30, 40, 64]), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    await write('data/textures/block/Pack/64/t000.png.zip', Buffer.from(zipSync({ 't000.png': image })));
    await write('data/textures/block/Pack/64/t000_NRM.png', image);
    await write('data/textures/block/Pack/64/overlays.png', image);
    app = express(); app.use('/api/render-assets', assetsRouter);
  });
  afterEach(() => { process.chdir(cwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('serves a versioned manifest, all shader imports, native pixels and confined LOD assets', async () => {
    const response = await request(app).get('/api/render-assets/manifest').query({ size: 64, pack: 'Pack' }).expect(200);
    const manifest = response.body;
    expect(manifest.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.layers).toHaveLength(1);
    expect(manifest.layers[0]).toMatchObject({ layer: 0 });
    expect(manifest.lodModels).toEqual([{ name: 'Rod', filename: 'rod', relpath: 'Rod' }]);
    expect(manifest.lodBaseUrl).toBe('/api/render-assets/lod');
    expect(manifest.warnings.length).toBeGreaterThan(0);
    await request(app).get(manifest.shadersUrl).expect(200).expect(res => {
      expect(res.body['data/shader/common.glsl']).toBe('');
      expect(res.body['data/shader/cube/cube.vert']).toContain('#IMPORT');
    });
    for (const url of [manifest.layers[0].url, manifest.layers[0].normalUrl, manifest.overlayUrl]) {
      const png = await request(app).get(url).expect('Content-Type', /image\/png/).expect(200);
      expect([...await sharp(png.body).raw().toBuffer()]).toEqual([20, 30, 40, 64]);
    }
    await request(app).get('/api/render-assets/lod/Rod/rod.scene').expect(200).expect('Content-Type', /xml/);
    await request(app).get('/api/render-assets/lod/Rod/rod.material').expect(200).expect('Content-Type', /text/);
  });

  it('changes revision with filesystem edits and installation changes, includes custom only when present', async () => {
    const get = () => request(app).get('/api/render-assets/manifest').query({ size: 64, pack: 'Pack' }).expect(200);
    const first = (await get()).body;
    await write('data/shader/common.glsl', 'updated');
    expect((await get()).body.revision).not.toBe(first.revision);
    const image = await sharp({ create: { width: 1, height: 1, channels: 4, background: 'red' } }).png().toBuffer();
    await write('customBlockTextures/64/custom.png', image);
    const custom = (await get()).body;
    expect(custom.layers.map((layer: { layer: number }) => layer.layer)).toEqual([0, 7]);
    expect(custom.layers[1].normalUrl).toBeUndefined();
    const other = path.join(tmp, 'other'); fs.cpSync(game, other, { recursive: true });
    fs.writeFileSync('SMToolConfig.json', JSON.stringify({ starmadeDir: other }));
    expect((await get()).body.revision).not.toBe(custom.revision);
  });

  it('shows imported custom PNG normals even beside a native TGA archive, preserving vanilla TGA priority', async () => {
    const tga = Buffer.alloc(22); tga[2] = 2; tga.writeUInt16LE(1, 12); tga.writeUInt16LE(1, 14); tga[16] = 32; tga[17] = 0x28;
    tga.set([70, 80, 90, 23], 18);
    const image = await sharp(Buffer.from([20, 30, 40, 64]), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    await write('customBlockTextures/64/custom.png', image);
    const customArchive = Buffer.from(zipSync({ 'custom_NRM.tga': tga }));
    await write('customBlockTextures/64/custom_NRM.tga.zip', customArchive);
    await write('data/textures/block/Pack/64/t000_NRM.tga.zip', Buffer.from(zipSync({ 't000_NRM.tga': tga })));
    const manifest = () => request(app).get('/api/render-assets/manifest?size=64&pack=Pack').expect(200);
    const before = (await manifest()).body;
    for (const layer of before.layers) {
      const png = await request(app).get(layer.normalUrl).expect(200);
      expect([...await sharp(png.body).raw().toBuffer()]).toEqual([90, 80, 70, 23]);
    }
    app.use('/api/textures', texturesRouter);
    await request(app).put('/api/textures/custom-tile/0?size=64&map=normal').set('Content-Type', 'image/png').send(image).expect(200);
    const after = (await manifest()).body;
    expect(after.revision).not.toBe(before.revision);
    const custom = await request(app).get(after.layers[1].normalUrl).expect(200);
    expect([...(await sharp(custom.body).raw().toBuffer()).subarray(0, 4)]).toEqual([20, 30, 40, 64]);
    const vanilla = await request(app).get(after.layers[0].normalUrl).expect(200);
    expect([...await sharp(vanilla.body).raw().toBuffer()]).toEqual([90, 80, 70, 23]);
    expect(fs.readFileSync(path.join(game, 'customBlockTextures/64/custom_NRM.tga.zip'))).toEqual(customArchive);
  });

  it('reports optional missing overlay, normals and LOD; refuses an absent shader corpus or all layers', async () => {
    fs.unlinkSync(path.join(game, 'data/textures/block/Pack/64/overlays.png'));
    fs.unlinkSync(path.join(game, 'data/textures/block/Pack/64/t000_NRM.png'));
    fs.unlinkSync(path.join(game, 'data/config/mainConfig.xml'));
    const response = await request(app).get('/api/render-assets/manifest').query({ size: 64, pack: 'Pack' }).expect(200);
    expect(response.body.overlayUrl).toBeUndefined(); expect(response.body.lodModels).toEqual([]);
    expect(response.body.warnings.join(' ')).toMatch(/normal.*overlay.*LOD/i);
    await request(app).get('/api/render-assets/manifest').query({ size: 64, pack: 'Absent' }).expect(404);
    fs.rmSync(path.join(game, 'data/shader'), { recursive: true });
    await request(app).get('/api/render-assets/manifest').expect(503);
    await request(app).get('/api/render-assets/shaders.json').expect(503);
  });

  it('rejects traversal, disallowed files, unknown layers and symlinks outside the installation', async () => {
    await request(app).get('/api/render-assets/layers/4.png').query({ size: 64, pack: 'Pack' }).expect(400);
    await request(app).get('/api/render-assets/layers/1.png').query({ size: 64, pack: 'Pack' }).expect(404);
    await request(app).get('/api/render-assets/overlay.png').query({ size: 128, pack: 'Pack' }).expect(404);
    await request(app).get('/api/render-assets/lod/Rod/private.json').expect(400);
    await request(app).get('/api/render-assets/lod/%2e%2e%2fprivate.scene').expect(400);
    await request(app).get('/api/render-assets/lod/missing.scene').expect(404);
    fs.symlinkSync(tmp, path.join(game, 'data/models/lod/outside'));
    await request(app).get('/api/render-assets/lod/outside/private.scene').expect(400);
    fs.unlinkSync(path.join(game, 'data/models/lod/outside'));
    fs.symlinkSync(tmp, path.join(game, 'data/shader/outside'));
    await request(app).get('/api/render-assets/shaders.json').expect(400);
  });

  it('handles absent or invalid LOD metadata and repeated declarations without assuming attribute order', async () => {
    const get = () => request(app).get('/api/render-assets/manifest').query({ size: 64, pack: 'Pack' });
    for (const xml of ['<Config/>', '<Config><LOD/></Config>', '<Other/>']) {
      await write('data/config/mainConfig.xml', xml);
      expect((await get().expect(200)).body.lodModels).toEqual([]);
    }
    for (const xml of ['<Config>', '<Config><LOD><Bad>invalid</Bad></LOD></Config>', '<Config><LOD><Bad filename="bad"/></LOD></Config>']) {
      await write('data/config/mainConfig.xml', xml);
      await get().expect(400).expect(res => expect(res.body.error).toMatch(/Invalid/));
    }
    await write('data/config/mainConfig.xml', '<Config><LOD path="/models/lod"><Rod filename="a" relpath="Rod"/><Rod relpath="Rod" filename="b"/></LOD></Config>');
    expect((await get().expect(200)).body.lodModels.map((entry: { filename: string }) => entry.filename)).toEqual(['a', 'b']);
    await write('data/config/mainConfig.xml', '<Config><LOD><Bad filename="a" relpath="../outside"/></LOD></Config>');
    await get().expect(400);
  });

  it('returns JSON asset errors and exposes only supported existing LOD files', async () => {
    await write('data/models/lod/Rod/rod.mesh.xml', '<mesh/>');
    await write('data/models/lod/Rod/rod.png', await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer());
    await request(app).get('/api/render-assets/lod/Rod/rod.png').expect(200).expect('Content-Type', /image/);
    await request(app).get('/api/render-assets/lod/Rod/rod.mesh.xml').expect(200).expect('Content-Type', /xml/);
    await request(app).get('/api/render-assets/layers/1.png?size=64&pack=Pack').expect(404).expect('Content-Type', /json/).expect(res => expect(res.body.error).toContain('missing'));
    fs.rmSync(path.join(game, 'data/models/lod'), { recursive: true });
    await request(app).get('/api/render-assets/lod/Rod/rod.scene').expect(404);
    fs.writeFileSync('SMToolConfig.json', '{');
    await request(app).get('/api/render-assets/shaders.json').expect(500).expect(res => expect(res.body.error).toBeTypeOf('string'));
  });

  it('reads the actual mainConfig Model root and normalizes slash-delimited LOD directories', async () => {
    await write('data/config/mainConfig.xml', '<Model><LOD><Rod relpath="/Rod/" filename="rod"/></LOD></Model>');
    const response = await request(app).get('/api/render-assets/manifest?size=64&pack=Pack').expect(200);
    expect(response.body.lodModels).toEqual([{ name: 'Rod', relpath: 'Rod', filename: 'rod' }]);
  });

  it('warns when a native RGB normal map lacks material alpha rather than implying emission', async () => {
    const image = await sharp(Buffer.from([20, 30, 40]), { raw: { width: 1, height: 1, channels: 3 } }).png().toBuffer();
    await write('customBlockTextures/64/custom.png', image);
    await write('customBlockTextures/64/custom_NRM.png', image);
    const result = await request(app).get('/api/render-assets/manifest?size=64&pack=Pack').expect(200);
    expect(result.body.warnings.join(' ')).toContain('layer 7 has no alpha');
    const normal = await request(app).get(result.body.layers.find((entry: { layer: number }) => entry.layer === 7).normalUrl).expect(200);
    expect([...await sharp(normal.body).raw().toBuffer()]).toEqual([20, 30, 40, 0]);
  });

  it('rejects scene and material dependencies that escape the LOD asset scope before the browser loads them', async () => {
    const url = '/api/render-assets/lod/Rod/rod.scene';
    for (const reference of ['../../outside.mesh', 'https://external.invalid/a.mesh', '%2e%2e/%2e%2e/outside.mesh', 'bad%']) {
      await write('data/models/lod/Rod/rod.scene', `<scene><entity meshFile="${reference}"/></scene>`);
      await request(app).get(url).expect(400).expect(res => expect(res.body.error).toContain('reference'));
    }
    await write('data/models/lod/Rod/rod.scene', '<scene><entity meshFile="rod.mesh"/><entity meshFile="../Rod/rod.mesh"/></scene>');
    await request(app).get(url).expect(200);
    await write('data/models/lod/Rod/rod.mesh.xml', '<mesh><skeletonlink name="../../private.skeleton"/></mesh>');
    await request(app).get('/api/render-assets/lod/Rod/rod.mesh.xml').expect(400);
    await write('data/models/lod/Rod/rod.material', 'material Rod\n{\ntexture ../../outside.png\n}');
    await request(app).get('/api/render-assets/lod/Rod/rod.material').expect(400);
    await write('data/models/lod/Rod/rod.material', 'material Rod\n{\ntexture rod.png\n}');
    await request(app).get('/api/render-assets/lod/Rod/rod.material').expect(200);
    await write('data/models/lod/Rod/rod.scene', '<scene>');
    await request(app).get(url).expect(400);
  });

});
