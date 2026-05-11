/**
 * @fileoverview Express API server — StarMade Block Editor backend.
 *
 * ## Modes
 *
 * ### Development (`npm run dev`)
 * The Vite dev server runs on port 5174 and proxies `/api/*` requests here
 * (port 3847). CORS is enabled to allow cross-origin requests from Vite.
 *
 * ### Production (`npm start` after `npm run build`)
 * A single Express process serves both the API and the pre-built client:
 *  - `/api/*`  — REST API routes
 *  - `/*`      — static files from `client/dist/`
 *  - `/*`      — fallback to `client/dist/index.html` (SPA routing)
 *
 * The port defaults to 3847 but can be overridden with the `PORT` environment
 * variable for flexible deployment:
 *
 *   PORT=8080 npm start
 *
 * ## API routes
 *
 *  Path               │ Module              │ Purpose
 *  ───────────────────┼─────────────────────┼────────────────────────────────────────
 *  `/api/config`      │ `api/config.ts`     │ Read / write `SMToolConfig.json`
 *  `/api/blocks`      │ `api/blocks.ts`     │ CRUD on BlockConfig.xml block definitions
 *  `/api/textures`    │ `api/textures.ts`   │ Serve atlas textures and icons
 *  `/api/health`      │ (inline)            │ Liveness check endpoint
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { configRouter }   from './api/config.js';
import { blocksRouter, warmBlockCache } from './api/blocks.js';
import { texturesRouter, warmAtlasCache, warmIconCache } from './api/textures.js';

// ── Environment ───────────────────────────────────────────────────────────────

/** Running mode — affects CORS and static file serving. */
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Server port. Override with the PORT environment variable.
 * Default: 3847 (development) — use PORT=80 or PORT=3000 for production.
 */
const PORT = parseInt(process.env.PORT ?? '3847', 10);

// ── Client dist path ─────────────────────────────────────────────────────────

/**
 * Absolute path to the compiled React client (`client/dist/`).
 * Resolved relative to this file's location in `server/dist/`.
 * In production: server/dist/index.js → ../../client/dist
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * CORS — only needed in development (Vite dev server lives on a different port).
 * In production Express serves the client directly, so no cross-origin requests.
 */
if (!IS_PROD) {
  app.use(cors());
}

/**
 * Compress text/JSON responses to reduce transfer time for large payloads such
 * as `/api/blocks`. PNG atlas/icon responses are excluded because they are
 * already compressed and re-compressing them wastes CPU for negligible gain.
 */
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (
      req.path.startsWith('/api/textures/atlas') ||
      req.path.startsWith('/api/textures/tile/') ||
      req.path.startsWith('/api/textures/icon/') ||
      req.path.startsWith('/api/textures/icons/sheet/')
    ) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

/** Parse JSON request bodies (block saves, config updates). */
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/config',   configRouter);
app.use('/api/blocks',   blocksRouter);
app.use('/api/textures', texturesRouter);

/**
 * GET /api/health
 * Liveness check endpoint — used by process monitors and CI pipelines.
 *
 * Response: `{ "ok": true, "version": "1.0.0", "mode": "production" }`
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0', mode: IS_PROD ? 'production' : 'development' });
});

// ── Static client (production only) ──────────────────────────────────────────

if (IS_PROD) {
  /**
   * Serve pre-built React client as static files.
   * Assets are served with long-lived cache headers because Vite fingerprints
   * filenames (e.g. `index-C6chkKuG.js`) — stale content is never an issue.
   */
  app.use(express.static(CLIENT_DIST, {
    maxAge: '1y',       // Immutable fingerprinted assets
    index: false,       // Let the SPA fallback handle the root
  }));

  /**
   * SPA fallback — serve `index.html` for any non-API route so that
   * client-side navigation (if added in future) works correctly when
   * the page is refreshed or accessed directly via URL.
   */
  app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  if (IS_PROD) {
    console.log(`[BlockEditor] Production server running on http://localhost:${PORT}`);
    console.log(`[BlockEditor] Serving client from: ${CLIENT_DIST}`);
  } else {
    console.log(`[BlockEditor Server] Running on http://localhost:${PORT}`);
    console.log(`[BlockEditor Server] Client dev server: http://localhost:5174`);
  }

  try {
    const { dir, count } = warmBlockCache();
    console.log(`[BlockEditor Server] Block cache warmed: ${count} blocks from ${dir}`);
  } catch (error) {
    console.warn(`[BlockEditor Server] Block cache warm-up skipped: ${(error as Error).message}`);
  }

  void warmAtlasCache()
    .then(({ pack, size, diffuseBytes, normalBytes }) => {
      console.log(
        `[BlockEditor Server] Atlas cache warmed: ${pack} ${size}px ` +
        `(diffuse ${(diffuseBytes / 1024 / 1024).toFixed(1)} MB, ` +
        `normal ${(normalBytes / 1024 / 1024).toFixed(1)} MB)`,
      );
    })
    .catch((error) => {
      console.warn(`[BlockEditor Server] Atlas cache warm-up skipped: ${(error as Error).message}`);
    });

  void warmIconCache()
    .then(({ icons, sheets, failed }) => {
      console.log(
        `[BlockEditor Server] Icon cache warmed: ${icons} icons across ${sheets} sheets` +
        (failed > 0 ? ` (${failed} failed)` : ''),
      );
    })
    .catch((error) => {
      console.warn(`[BlockEditor Server] Icon cache warm-up skipped: ${(error as Error).message}`);
    });
});
