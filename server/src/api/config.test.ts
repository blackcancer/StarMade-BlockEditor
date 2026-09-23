import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { configFilePath, configRouter, loadConfig, saveConfig, validateDir, VALID_SIZES } from './config.js';
import * as atomic from '../services/atomicFile.js';

describe('config API helpers', () => {
  const originalCwd = process.cwd();
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-config-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates a default config when SMToolConfig.json is missing', () => {
    expect(configFilePath()).toBe(path.join(tmp, 'SMToolConfig.json'));
    expect(loadConfig()).toEqual({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default' });
    expect(fs.existsSync(path.join(tmp, 'SMToolConfig.json'))).toBe(true);
  });

  it('normalizes missing and invalid persisted values', () => {
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: '/game', atlasSize: 512 }), 'utf8');
    expect(loadConfig()).toEqual({ starmadeDir: '/game', worldDir: 'world0', atlasSize: 256, texturePack: 'Default' });
    expect(VALID_SIZES).toEqual([64, 128, 256]);
  });

  function makeValidGameRoot(): string {
    const game = path.join(tmp, 'StarMade');
    fs.mkdirSync(path.join(game, 'data', 'config'), { recursive: true });
    fs.mkdirSync(path.join(game, 'customBlockTextures', '256'), { recursive: true });
    fs.writeFileSync(path.join(game, 'data', 'config', 'BlockConfig.xml'), '<Config/>');
    fs.writeFileSync(path.join(game, 'data', 'config', 'BlockTypes.properties'), 'HULL=1');
    return game;
  }

  it('saves config exactly and validates required StarMade files', () => {
    saveConfig({ starmadeDir: '/saved', worldDir: 'world1', atlasSize: 64, texturePack: 'Custom' });
    expect(JSON.parse(fs.readFileSync(path.join(tmp, 'SMToolConfig.json'), 'utf8'))).toEqual({
      starmadeDir: '/saved',
      worldDir: 'world1',
      atlasSize: 64,
      texturePack: 'Custom',
    });

    const game = path.join(tmp, 'StarMade');
    fs.mkdirSync(path.join(game, 'data', 'config'), { recursive: true });
    fs.mkdirSync(path.join(game, 'customBlockTextures', '256'), { recursive: true });
    fs.writeFileSync(path.join(game, 'data', 'config', 'BlockConfig.xml'), '<Config/>');
    expect(validateDir(game).valid).toBe(false);

    fs.writeFileSync(path.join(game, 'data', 'config', 'BlockTypes.properties'), 'HULL=1');
    expect(validateDir(game)).toEqual({ valid: true, missing: [] });
  });

  it('serves config GET/POST/check routes with validation and atlas-size guarding', async () => {
    const app = express();
    app.use(express.json());
    app.use('/config', configRouter);
    const game = makeValidGameRoot();

    await request(app)
      .post('/config')
      .send({ starmadeDir: game, worldDir: 'world2', atlasSize: 64, texturePack: 'MyPack' })
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({ starmadeDir: game, worldDir: 'world2', atlasSize: 64, texturePack: 'MyPack', isValid: true, missing: [] });
      });

    await request(app)
      .get('/config')
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({ starmadeDir: game, worldDir: 'world2', atlasSize: 64, texturePack: 'MyPack', isValid: true });
      });

    await request(app)
      .get('/config/check')
      .query({ dir: path.join(tmp, 'missing') })
      .expect(200)
      .expect(res => {
        expect(res.body.valid).toBe(false);
        expect(res.body.missing.length).toBeGreaterThan(0);
      });
  });
  it('accepts a fresh installation without any custom texture or world', () => {
    const game = makeValidGameRoot();
    fs.rmSync(path.join(game, 'customBlockTextures'), { recursive: true });
    expect(validateDir(game)).toEqual({ valid: true, missing: [] });
    expect(validateDir('').valid).toBe(false);
  });

  it('retains unrelated configuration fields and backups on a settings update', () => {
    fs.writeFileSync(configFilePath(), JSON.stringify({ starmadeDir: '/game', extension: { keep: true } }));
    saveConfig({ starmadeDir: '/next', worldDir: 'world0', atlasSize: 128, texturePack: 'Default' });
    expect(JSON.parse(fs.readFileSync(configFilePath(), 'utf8')).extension).toEqual({ keep: true });
    expect(fs.readdirSync(tmp).some(name => name.includes('.backup-'))).toBe(true);
  });

  it('rejects malformed HTTP configuration values without altering the saved file', async () => {
    const app = express(); app.use(express.json()); app.use('/config', configRouter);
    loadConfig(); const original = fs.readFileSync(configFilePath());
    for (const input of [{ starmadeDir: 3 }, { worldDir: null }, { texturePack: [] }, { atlasSize: 999 }, { unknown: true }]) {
      await request(app).post('/config').send(input).expect(400);
      expect(fs.readFileSync(configFilePath())).toEqual(original);
    }
    await request(app).get('/config/check').query({ dir: ['a', 'b'] }).expect(400);
  });

  it('reports IO or malformed-config failures as JSON and preserves original data', async () => {
    const app = express(); app.use(express.json()); app.use('/config', configRouter);
    fs.writeFileSync(configFilePath(), '{');
    await request(app).get('/config').expect(500).expect(res => expect(res.body.error).toBeTruthy());
    await request(app).get('/config/check').expect(500);
    await request(app).post('/config').send({}).expect(500);
    expect(fs.readFileSync(configFilePath(), 'utf8')).toBe('{');
  });

  it('locks a hosted preview to its disposable installation while keeping atlas settings editable', async () => {
    const game = makeValidGameRoot();
    vi.stubEnv('EDITOR_FIXED_STARMADE_DIR', game);
    expect(loadConfig().starmadeDir).toBe(game);
    fs.writeFileSync(configFilePath(), JSON.stringify({ starmadeDir: '/other' }));
    expect(loadConfig().starmadeDir).toBe(game);
    const app = express(); app.use(express.json()); app.use('/config', configRouter);
    await request(app).post('/config').send({ starmadeDir: '/other' }).expect(403);
    await request(app).post('/config').send({ starmadeDir: game, atlasSize: 128 }).expect(200);
    await request(app).post('/config').send({ texturePack: 'Default' }).expect(200);
    await request(app).get('/config/check').query({ dir: '/other' }).expect(403);
    await request(app).get('/config/check').expect(200).expect(res => expect(res.body.valid).toBe(true));
  });

  it('normalizes malformed persisted fields but refuses non-object documents', () => {
    fs.writeFileSync(configFilePath(), JSON.stringify({ starmadeDir: null, worldDir: 1, texturePack: false }));
    expect(loadConfig()).toEqual({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default' });
    for (const value of [null, 3, []]) {
      fs.writeFileSync(configFilePath(), JSON.stringify(value));
      expect(() => loadConfig()).toThrow(SyntaxError);
    }
  });

  it('rejects non-object patches and reports concurrent config changes', async () => {
    const app = express(); app.use(express.json()); app.use('/config', configRouter);
    await request(app).post('/config').send([]).expect(400);
    loadConfig();
    vi.spyOn(atomic, 'atomicWriteFile').mockImplementation(() => { throw new atomic.FileConflictError(); });
    await request(app).post('/config').send({ atlasSize: 64 }).expect(409);
  });

});
