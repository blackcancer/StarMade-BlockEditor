/** @fileoverview Start the editor on loopback; remote access uses a configured reverse proxy. */
import { createApp } from './app.js';
import { warmBlockCache } from './api/blocks.js';

const portText = process.env.PORT ?? '3847';
const port = Number(portText);
if (!/^\d+$/.test(portText) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
createApp().listen(port, '127.0.0.1', () => {
  console.info(`[BlockEditor] Listening on http://127.0.0.1:${port}`);
  try {
    const { count, dir } = warmBlockCache();
    console.info(`[BlockEditor] Loaded ${count} blocks from ${dir}`);
  } catch (error) {
    console.warn(`[BlockEditor] Catalogue unavailable: ${(error as Error).message}`);
  }
});
