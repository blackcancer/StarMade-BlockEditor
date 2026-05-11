/**
 * @fileoverview Express API server — StarMade Block Editor backend.
 *
 * Starts a local HTTP server on port 3847 that the Vite dev server proxies
 * (configured in `vite.config.ts`). In production the client is served as
 * static files from the same Express process.
 *
 * ## API routes
 *
 *  Path               │ Module              │ Purpose
 *  ───────────────────┼─────────────────────┼──────────────────────────────────────────
 *  `/api/config`      │ `api/config.ts`     │ Read / write `SMToolConfig.json`
 *  `/api/blocks`      │ `api/blocks.ts`     │ CRUD on BlockConfig.xml block definitions
 *  `/api/textures`    │ `api/textures.ts`   │ Serve / import atlas textures and icons
 *  `/api/health`      │ (inline)            │ Liveness check endpoint
 *
 * ## CORS
 * CORS is enabled for all origins to allow the Vite dev server (port 5174) to
 * call the API server (port 3847) without a proxy in development mode.
 *
 * ## Body parsing
 * - `express.json()` handles JSON request bodies (block saves, config updates).
 * - `express.raw()` is registered per-route in `textures.ts` for binary image uploads.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import { configRouter }   from './api/config.js';
import { blocksRouter }   from './api/blocks.js';
import { texturesRouter } from './api/textures.js';

/** Port the API server listens on. Proxied by Vite on port 5174. */
const PORT = 3847;

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

/** Allow cross-origin requests from the Vite dev server. */
app.use(cors());

/** Parse JSON request bodies (used by block saves and config updates). */
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/config',   configRouter);    // Editor configuration management
app.use('/api/blocks',   blocksRouter);    // Block definition CRUD
app.use('/api/textures', texturesRouter);  // Texture atlas serving and import

// ── Health check ──────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Liveness endpoint for process monitors and CI checks.
 *
 * Response: `{ "ok": true, "version": "1.0.0" }`
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[BlockEditor Server] Running on http://localhost:${PORT}`);
});
