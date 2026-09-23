import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

vi.mock('./api/config.js', async () => { const { Router } = await import('express'); const configRouter = Router(); configRouter.get('/', (_req, res) => res.json({ configured: true })); configRouter.post('/', (req, res) => res.json(req.body)); return { configRouter }; });
vi.mock('./api/blocks.js', async () => { const { Router } = await import('express'); const blocksRouter = Router(); blocksRouter.get('/', (_req, res) => res.json({ content: 'x'.repeat(5000) })); blocksRouter.get('/broken', (_req, _res, next) => next(new Error('/private/secret.xml'))); return { blocksRouter }; });
vi.mock('./api/textures.js', async () => { const { Router } = await import('express'); const texturesRouter = Router(); texturesRouter.get('/atlas', (_req, res) => res.type('png').send(Buffer.alloc(5000))); return { texturesRouter }; });
vi.mock('./api/assets.js', async () => { const { Router } = await import('express'); const assetsRouter = Router(); assetsRouter.get('/manifest', (_req, res) => res.json({ native: true })); return { assetsRouter }; });
import { createApp } from './app.js';

describe('local HTTP boundary', () => {
  let directory: string;
  beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blockeditor-http-')); fs.writeFileSync(path.join(directory, 'index.html'), '<!doctype html><div id="root"></div>'); fs.writeFileSync(path.join(directory, 'client.js'), 'console.log("app")'); });
  afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); vi.unstubAllEnvs(); });
  it('serves the API and native asset router with safe response headers', async () => {
    const app = createApp();
    await request(app).get('/api/health').expect(200).expect('X-Content-Type-Options', 'nosniff').expect(({ body }) => expect(body.version).toBe('1.1.3'));
    await request(app).get('/api/render-assets/manifest').expect(200, { native: true });
    await request(app).get('/api/config').expect(200, { configured: true });
  });
  it('rejects foreign hosts and cross-origin writes, permitting local CLI and same-origin clients', async () => {
    const app = createApp({ production: true });
    await request(app).get('/api/health').set('Host', 'attacker.example').expect(403);
    await request(app).post('/api/config').set('Origin', 'https://attacker.example').send({}).expect(403);
    await request(app).post('/api/config').set('Host', 'localhost:3847').set('Origin', 'http://localhost:3847').send({ value: 3 }).expect(200, { value: 3 });
    await request(app).post('/api/config').set('Host', '[::1]:3847').send({ value: 2 }).expect(200, { value: 2 });
    await request(app).post('/api/config').set('Sec-Fetch-Site', 'cross-site').send({}).expect(403);
    await request(app).post('/api/config').set('Origin', 'not a URL').send({}).expect(403);
  });
  it('allows only the local Vite origin during development, including its preflight', async () => {
    const app = createApp({ production: false });
    await request(app).options('/api/config').set('Origin', 'http://localhost:5174').expect(204).expect('Access-Control-Allow-Origin', 'http://localhost:5174');
    await request(app).post('/api/config').set('Origin', 'http://127.0.0.1:5174').send({}).expect(200);
    await request(app).post('/api/config').set('Origin', 'http://localhost:9999').send({}).expect(403);
    await request(createApp({ production: true })).post('/api/config').set('Origin', 'http://localhost:5174').send({}).expect(403);
  });
  it('returns API errors as safe JSON instead of falling back to the SPA', async () => {
    const app = createApp({ production: true, clientDir: directory });
    await request(app).get('/api/unknown').expect(404).expect('Content-Type', /json/);
    const failure = await request(app).get('/api/blocks/broken').expect(500);
    expect(failure.text).not.toContain('secret.xml');
    await request(app).post('/api/config').set('Content-Type', 'application/json').send('{broken').expect(400);
    await request(app).post('/api/config').send({ huge: 'x'.repeat(1024 * 1024 + 1) }).expect(413);
  });
  it('serves production HTML without stale caching and compresses JSON rather than PNG', async () => {
    const app = createApp({ production: true, clientDir: directory });
    await request(app).get('/').expect(200).expect('Cache-Control', 'no-store').expect('Content-Security-Policy', /frame-ancestors 'none'/);
    await request(app).get('/client.js').expect(200);
    await request(app).get('/api/blocks').set('Accept-Encoding', 'gzip').expect('Content-Encoding', 'gzip');
    const png = await request(app).get('/api/textures/atlas').set('Accept-Encoding', 'gzip').expect(200);
    expect(png.headers['content-encoding']).toBeUndefined();
    await request(createApp({ production: false })).get('/').expect(404);
  });
  it('allows a public origin without a token and enforces an optional private link when configured', async () => {
    await request(createApp({ publicOrigin: 'https://preview.example:8003' })).get('/api/config').set('Host', 'preview.example:8003').expect(200, { configured: true });
    const app = createApp({ production: true, clientDir: directory, publicOrigin: 'https://preview.example:8003', accessToken: 'private-key' });
    await request(app).get('/api/health').set('Host', 'preview.example:8003').expect(200);
    await request(app).get('/api/config').set('Host', 'preview.example:8003').expect(401);
    await request(app).get('/?access=wrong').set('Host', 'preview.example:8003').expect(401);
    await request(app).get('/?access[x]=wrong').set('Host', 'preview.example:8003').expect(401);
    await request(app).post('/?access=private-key').set('Host', 'preview.example:8003').expect(401);
    const login = await request(app).get('/?access=private-key').set('Host', 'preview.example:8003').set('Sec-Fetch-Site', 'cross-site').expect(303).expect('Location', '/');
    expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly; Secure; SameSite=Strict/);
    await request(app).get('/api/config').set('Host', 'preview.example:8003').set('Cookie', 'other=one; smbe_access=private-key; last=two').expect(200);
    await request(app).get('/api/config').set('Cookie', 'other=one').expect(401);
    await request(app).get('/api/config').set('Cookie', 'smbe_access=wrong').expect(401);
    await request(app).post('/api/config').set('Host', 'preview.example:8003').set('Origin', 'https://preview.example:8003').set('Cookie', 'smbe_access=private-key').send({ value: 8 }).expect(200, { value: 8 });
  });
  it('supports environment hosting settings and local private access without a TLS proxy', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('EDITOR_PUBLIC_ORIGIN', 'http://preview.example:8003'); vi.stubEnv('EDITOR_ACCESS_TOKEN', 'env-key');
    const login = await request(createApp()).get('/?access=env-key').set('Host', 'preview.example:8003').expect(303);
    expect(login.headers['set-cookie'][0]).not.toContain('Secure');
    vi.stubEnv('EDITOR_PUBLIC_ORIGIN', undefined);
    const localLogin = await request(createApp()).get('/?access=env-key').expect(303);
    expect(localLogin.headers['set-cookie'][0]).not.toContain('Secure');
  });
  it('returns a safe error if a production build has not been generated', async () => {
    fs.unlinkSync(path.join(directory, 'index.html'));
    await request(createApp({ production: true, clientDir: directory })).get('/').expect(500, { error: 'Unable to complete the request.' });
  });

  it('rejects HTTP requests with no Host header', async () => {
    const server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const address = server.address() as { port: number };
      const response = await new Promise<string>((resolve, reject) => {
        const socket = net.connect(address.port, '127.0.0.1', () => socket.write('GET /api/health HTTP/1.0\r\n\r\n'));
        let data = ''; socket.on('data', chunk => { data += chunk; });
        socket.on('end', () => resolve(data)); socket.on('error', reject);
      });
      expect(response).toMatch(/^HTTP\/1\.1 403/);

    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  it('accepts the encoded cookie emitted for a token containing punctuation', async () => {
    const app = createApp({ accessToken: 'key+/=' });
    const login = await request(app).get('/?access=key%2B%2F%3D').expect(303);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await request(app).get('/api/config').set('Cookie', cookie).expect(200);
  });

});
