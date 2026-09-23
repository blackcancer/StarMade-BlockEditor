/** @fileoverview Express boundary for local editing and an explicitly configured remote preview. */
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { configRouter } from './api/config.js';
import { blocksRouter } from './api/blocks.js';
import { texturesRouter } from './api/textures.js';
import { assetsRouter } from './api/assets.js';

/** Hosting options; an optional access token can protect a configured remote origin. */
export interface AppOptions {
  production?: boolean;
  clientDir?: string;
  publicOrigin?: string;
  accessToken?: string;
}

/** Compare access tokens without exposing their length through a timing-sensitive comparison. */
function matches(candidate: unknown, token: string): boolean {
  return typeof candidate === 'string' && timingSafeEqual(
    createHash('sha256').update(candidate).digest(), createHash('sha256').update(token).digest(),
  );
}

/** Construct the app without opening a port or reading/writing any game data. */
export function createApp(options: AppOptions = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const publicOrigin = options.publicOrigin ?? process.env.EDITOR_PUBLIC_ORIGIN;
  const accessToken = options.accessToken ?? process.env.EDITOR_ACCESS_TOKEN;
  const publicHost = publicOrigin ? new URL(publicOrigin).host : null;
  const clientDir = options.clientDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (production) res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const host = req.headers.host ?? '';
    if (host !== publicHost && !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) {
      res.status(403).json({ error: 'This host is not permitted.' }); return;
    }
    const origin = req.headers.origin;
    const sameOrigin = origin === `${req.protocol}://${host}` || origin === publicOrigin;
    const developmentOrigin = !production && (origin === 'http://localhost:5174' || origin === 'http://127.0.0.1:5174');
    if ((origin && !sameOrigin && !developmentOrigin) || (req.headers['sec-fetch-site'] === 'cross-site' && !['GET', 'HEAD'].includes(req.method))) {
      res.status(403).json({ error: 'Cross-origin access is not permitted.' }); return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-Match');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', 'ETag');
      res.vary('Origin');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    if (accessToken && req.path !== '/api/health') {
      if (req.method === 'GET' && req.path === '/' && matches(req.query.access, accessToken)) {
        res.cookie('smbe_access', accessToken, { httpOnly: true, secure: publicOrigin?.startsWith('https:') ?? false, sameSite: 'strict', maxAge: 86400000 });
        res.setHeader('Cache-Control', 'no-store'); res.redirect(303, '/'); return;
      }
      const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('smbe_access='))?.slice('smbe_access='.length);
      if (!matches(cookie, encodeURIComponent(accessToken))) { res.setHeader('Cache-Control', 'no-store'); res.status(401).json({ error: 'Open the private preview link to access this editor.' }); return; }
    }
    next();
  });
  app.use(compression({ threshold: 1024, filter: (req, res) => !req.path.startsWith('/api/textures/') && compression.filter(req, res) }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (_req, res) => { res.json({ ok: true, version: '1.1.2', mode: production ? 'production' : 'development' }); });
  app.use('/api/config', configRouter);
  app.use('/api/blocks', blocksRouter);
  app.use('/api/textures', texturesRouter);
  app.use('/api/render-assets', assetsRouter);
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found.' }); });
  if (production) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(clientDir, 'index.html'), error => { if (error) next(error); });
    });
  }
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 413 ? 'Request body is too large.' : status === 400 ? 'Invalid JSON request.' : 'Unable to complete the request.' });
  });
  return app;
}
