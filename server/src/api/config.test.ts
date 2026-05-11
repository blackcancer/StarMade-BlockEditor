import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { configFilePath, configRouter, loadConfig, saveConfig, validateDir, VALID_SIZES } from './config.js';

describe('config API helpers', () => {
  const originalCwd = process.cwd();
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-config-'));
    process.chdir(tmp);
  });

  afterEach(() => {
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
    fs.writeFileSync(path.join(game, 'customBlockTextures', '256', 'custom.png'), 'not-a-real-png');
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

    fs.writeFileSync(path.join(game, 'customBlockTextures', '256', 'custom.png'), 'not-a-real-png');
    expect(validateDir(game)).toEqual({ valid: true, missing: [] });
  });

  it('serves config GET/POST/check routes with validation and atlas-size guarding', async () => {
    const app = express();
    app.use(express.json());
    app.use('/config', configRouter);
    const game = makeValidGameRoot();

    await request(app)
      .post('/config')
      .send({ starmadeDir: game, worldDir: 'world2', atlasSize: 999, texturePack: 'MyPack' })
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({ starmadeDir: game, worldDir: 'world2', atlasSize: 256, texturePack: 'MyPack', isValid: true, missing: [] });
      });

    await request(app)
      .get('/config')
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({ starmadeDir: game, worldDir: 'world2', atlasSize: 256, texturePack: 'MyPack', isValid: true });
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
});
