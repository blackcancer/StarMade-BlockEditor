/**
 * @fileoverview Express API server — StarMade Block Editor
 *
 * Provides REST endpoints for:
 *  - /api/config   — read/write starmadeDir + atlasSize
 *  - /api/blocks   — read/write block definitions via StarMade-Decoder
 *  - /api/textures — serve and slice the texture atlas PNG
 *
 * Runs on port 3847 (proxied by Vite dev server on 5174).
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { configRouter } from './api/config.js';
import { blocksRouter } from './api/blocks.js';
import { texturesRouter } from './api/textures.js';

const PORT = 3847;

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/config',   configRouter);
app.use('/api/blocks',   blocksRouter);
app.use('/api/textures', texturesRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[BlockEditor Server] Running on http://localhost:${PORT}`);
});
