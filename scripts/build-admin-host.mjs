/**
 * @fileoverview Build embeddable, source-derived editor modules for StarMade-Admin.
 * The browser mounts the existing editor into a shadow root; the worker confines
 * all original editor routes to a backend-selected disposable workspace.
 * @module scripts/build-admin-host
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const out = path.resolve('../admin-workspace-dependencies');
const temp = path.resolve('.admin-build');
fs.mkdirSync(temp, {recursive:true});
fs.mkdirSync(path.join(out,'sdk'),{recursive:true});
fs.mkdirSync(path.join(out,'web'),{recursive:true});
fs.writeFileSync(path.join(temp,'fetch.ts'), `
let csrf = '';
export function setCsrf(value: string) { csrf = value; }
export function fetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const url = String(input);
  if (url.startsWith('/api/') && csrf) headers.set('X-CSRF-Token', csrf);
  return globalThis.fetch(input, {...init, headers});
}
`);
const css=fs.readFileSync('client/src/style.css','utf8').replaceAll(':root', ':host').replace(/\bbody\s*\{/g, ':host {');
fs.writeFileSync(path.join(temp,'embedded.tsx'), `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../client/src/App';
import {setCsrf} from './fetch';
export function mountEditor(host: HTMLElement, options: {csrf: string}) {
  setCsrf(options.csrf);
  const shadow = host.shadowRoot ?? host.attachShadow({mode:'open'});
  shadow.innerHTML = '';
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(${JSON.stringify(css + '\n:host{display:block;height:100%;min-height:580px;color-scheme:dark}.app-root{height:100%;min-height:580px}.app-header{min-height:56px}.app-logo{display:none}')});
  shadow.adoptedStyleSheets = [sheet];
  const element = document.createElement('div'); element.style.height='100%'; shadow.append(element);
  const root = createRoot(element); root.render(<App />);
  return () => { root.unmount(); shadow.innerHTML = ''; };
}
`);
await build({entryPoints:[path.join(temp,'embedded.tsx')],outfile:path.join(out,'web/block-editor.mjs'),bundle:true,platform:'browser',format:'esm',jsx:'automatic',minify:true,inject:[path.join(temp,'fetch.ts')],define:{'process.env.NODE_ENV':'"production"'}});
fs.writeFileSync(path.join(temp,'worker.ts'), `
import express from 'express';
import {timingSafeEqual,createHash} from 'node:crypto';
import {configRouter,loadConfig} from '../server/src/api/config';
import {blocksRouter} from '../server/src/api/blocks';
import {texturesRouter} from '../server/src/api/textures';
import {assetsRouter} from '../server/src/api/assets';
const token=process.env.ADMIN_WORKSPACE_TOKEN;
if(!token || !process.env.EDITOR_FIXED_STARMADE_DIR)throw new Error('Private worker configuration is required');
const app=express(); app.disable('x-powered-by');
app.use((req,res,next)=>{const value=req.headers['x-workspace-token']; if(typeof value!=='string'||!timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(token).digest())){res.sendStatus(403);return;} next();});
app.use(express.json({limit:'1mb'})); loadConfig();
app.use('/api/config',configRouter);app.use('/api/blocks',blocksRouter);app.use('/api/textures',texturesRouter);app.use('/api/render-assets',assetsRouter);
app.use((err,req,res,next)=>{res.status(500).json({error:'Workspace request failed.'});});
const server=app.listen(0,'127.0.0.1',()=>{process.send?.({type:'ready',port:(server.address() as any).port});});
process.on('disconnect',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
`);
await build({entryPoints:[path.join(temp,'worker.ts')],outfile:path.join(out,'sdk/block-editor-worker.mjs'),bundle:true,platform:'node',format:'esm',banner:{js:"import { createRequire as __adminCreateRequire } from 'node:module'; const require = __adminCreateRequire(import.meta.url);"},external:['sharp']});
await build({entryPoints:['server/src/services/blockDto.ts'],outfile:path.join(out,'sdk/block-editor-dto.mjs'),bundle:true,platform:'node',format:'esm',banner:{js:"import { createRequire as __adminCreateRequire } from 'node:module'; const require = __adminCreateRequire(import.meta.url);"}});
fs.rmSync(temp,{recursive:true,force:true});
