#!/usr/bin/env node
/**
 * Real-browser editing recipe against a private disposable StarMade copy.
 * Run after npm run build with STARMADE_DIR and CHROMIUM_PATH set.
 * Source game files are only read. Reports and screenshots remain under /tmp;
 * the disposable game and loopback server are removed in finally, even on failure.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { observeNativePreview, checkDisplayPreview } from './display-browser-check.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert(process.env.STARMADE_DIR, 'Set STARMADE_DIR to a readable StarMade installation.');
assert(process.env.CHROMIUM_PATH, 'Set CHROMIUM_PATH to a Chromium executable.');
const source = fs.realpathSync(process.env.STARMADE_DIR);
const receipt = fs.mkdtempSync(path.join(os.tmpdir(), 'blockeditor-browser-check-'));
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'blockeditor-browser-data-'));
const game = path.join(workspace, 'StarMade');
const oldCwd = process.cwd();
const oldFixed = process.env.EDITOR_FIXED_STARMADE_DIR;
const paths = ['data/config', 'data/font', 'data/shader', 'data/models/lod', 'data/textures/block/Default/64', 'data/image-resource', 'customBlockConfig', 'customBlockTextures/64'];
const report = { source, receipt, checks: [], pageErrors: [], failedRequests: [] };
let browser;
let server;
let page;
const watchdog = setTimeout(() => { void browser?.close(); server?.closeAllConnections(); }, 600000);
watchdog.unref();

/** Hash all copied source files so the final receipt proves source preservation. */
function fingerprint() {
  const hash = createHash('sha256');
  function visit(file, relative) {
    if (!fs.existsSync(file)) return;
    const stat = fs.statSync(file);
    if (stat.isDirectory()) for (const child of fs.readdirSync(file).sort()) visit(path.join(file, child), `${relative}/${child}`);
    else if (stat.isFile()) hash.update(relative).update(fs.readFileSync(file));
  }
  for (const relative of paths) visit(path.join(source, relative), relative);
  return hash.digest('hex');
}
function check(name, details = {}) { report.checks.push({ name, ...details }); fs.writeFileSync(path.join(receipt, 'report.json'), JSON.stringify(report, null, 2)); console.log(`PASS ${name}`); }

try {
  report.sourceBefore = fingerprint();
  for (const relative of paths) {
    const original = path.join(source, relative);
    if (fs.existsSync(original)) {
      const target = path.join(game, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.cpSync(original, target, { recursive: true, dereference: true, errorOnExist: true });
    }
  }
  assert(fs.existsSync(path.join(game, 'data/config/BlockConfig.xml')), 'Source installation lacks BlockConfig.xml.');
  assert(fs.existsSync(path.join(repo, 'client/dist/index.html')), 'Run npm run build first.');
  fs.writeFileSync(path.join(workspace, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: game, worldDir: 'world0', atlasSize: 64, texturePack: 'Default' }));
  process.chdir(workspace);
  process.env.EDITOR_FIXED_STARMADE_DIR = game;
  const { createApp } = await import(pathToFileURL(path.join(repo, 'server/dist/app.js')).href);
  const app = createApp({ production: true, clientDir: path.join(repo, 'client/dist'), publicOrigin: '', accessToken: '' });
  server = await new Promise((resolve, reject) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle)); handle.on('error', reject);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`Temporary recipe: ${origin}, report ${receipt}`);
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, locale: 'en-US' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') report.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }); });
  await page.addInitScript(() => { if (!localStorage.getItem('smbe-locale')) localStorage.setItem('smbe-locale', 'en'); });
  page.on('dialog', dialog => void dialog.accept());
  const api = page.request;
  async function readBlock(id) { const response = await api.get(`${origin}/api/blocks/${id}`); assert.equal(response.status(), 200); return response.json(); }
  async function waitMutation(method, url, action, status = 200) {
    const [response] = await Promise.all([
      page.waitForResponse(response => response.request().method() === method && new URL(response.url()).pathname === url),
      action(),
    ]);
    assert.equal(response.status(), status, `${method} ${url}: HTTP ${response.status()}`);
    // Image writes intentionally use only response.ok in the UI. Avoid requesting
    // an unconsumed Fetch body through Chromium's debugging protocol; verify
    // their result independently through the public image endpoint below.
    return url.startsWith('/api/textures/') ? null : response.json();
  }
  const nameInput = () => page.locator('.properties-body section').first().locator('.field').first().locator('input');
  const saveButton = () => page.locator('.btn-save');
  async function settled() { await page.waitForFunction(() => document.querySelector('.btn-save')?.disabled === true); }
  async function select(block) {
    await page.locator('.sidebar-search input').fill(block.xmlTypeName);
    await page.locator('.block-card').first().click();
    await page.waitForFunction(name => document.querySelector('.properties-body input')?.value === name, block.name);
  }
  async function reloadSelection(block) { await page.reload(); await page.waitForSelector('.block-card'); await select(block); }

  await observeNativePreview(page);
  await page.goto(origin);
  await page.waitForSelector('.block-card');
  const config = await (await api.get(`${origin}/api/config`)).json();
  assert.equal(config.starmadeDir, game); assert.equal(config.isValid, true); assert.equal(config.atlasSize, 64);
  const forbidden = await api.post(`${origin}/api/config`, { data: { starmadeDir: source } });
  assert.equal(forbidden.status(), 403);
  const catalogResponse = await api.get(`${origin}/api/blocks`);
  assert.equal(catalogResponse.status(), 200); assert.match(catalogResponse.headers().etag, /^"[a-f0-9]{64}"$/);
  const initial = await catalogResponse.json(); assert(initial.length > 0);
  const vanilla = initial.find(block => !block.isCustom && !block.isDeprecated && block.blockStyle === 0 && !block.extraProperties.LodShape && block.icon >= 0);
  assert(vanilla, 'A vanilla cube is needed for the override recipe.');
  check('configuration, fixed installation guard and catalogue', { blocks: initial.length });
  const display = await checkDisplayPreview(page, origin, receipt);
  check('native Display screen, text, six orientations and icon export', { orientations: display.length });
  await select(vanilla);
  assert.equal(await nameInput().inputValue(), vanilla.name);
  check('search and block selection', { id: vanilla.id });

  const created = await waitMutation('POST', '/api/blocks', () => page.getByRole('button', { name: '+ New Block', exact: true }).click(), 201);
  await settled();
  const nested = { '@_keep': 'yes', Item: [{ '@_id': 'first', '#text': '001' }, { '@_id': 'second', Child: 'nested' }] };
  const seeded = await api.put(`${origin}/api/blocks/${created.id}`, { headers: { 'If-Match': `"${created.revision}"` }, data: { ...created, extraProperties: { ...created.extraProperties, BrowserRecipe: nested } } });
  assert.equal(seeded.status(), 200, await seeded.text());
  const seededBlock = await seeded.json();
  await reloadSelection(seededBlock);
  await nameInput().fill(`Browser recipe ${created.id}`);
  await waitMutation('PUT', `/api/blocks/${created.id}`, () => saveButton().click());
  await settled();
  const saved = await readBlock(created.id);
  assert.equal(saved.name, `Browser recipe ${created.id}`); assert.equal(saved.isCustom, true); assert.deepEqual(saved.extraProperties.BrowserRecipe, nested);
  await reloadSelection(saved);
  assert.equal(await nameInput().inputValue(), saved.name);
  assert.deepEqual((await readBlock(created.id)).extraProperties.BrowserRecipe, nested);
  const customXml = fs.readFileSync(path.join(game, 'customBlockConfig/BlockConfigImport.xml'), 'utf8');
  assert.match(customXml, /<BrowserRecipe keep="yes">/); assert.match(customXml, /<Item id="first">001<\/Item>/); assert.match(customXml, /<Child>nested<\/Child>/);
  check('custom creation, UI save, page reload and nested XML preservation', { id: created.id });

  await nameInput().fill('Unsaved conflict draft');
  const external = await api.put(`${origin}/api/blocks/${created.id}`, { headers: { 'If-Match': `"${saved.revision}"` }, data: { ...saved, name: 'External saved change' } });
  assert.equal(external.status(), 200, await external.text());
  await waitMutation('PUT', `/api/blocks/${created.id}`, () => saveButton().click(), 409);
  await page.getByRole('alert').filter({ hasText: /changed|reload/i }).first().waitFor();
  assert.equal(await nameInput().inputValue(), 'Unsaved conflict draft');
  assert.equal((await readBlock(created.id)).name, 'External saved change');
  assert.equal(await saveButton().isEnabled(), true);
  check('stale save rejected with visible error and unsaved draft retained');
  const refreshed = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/blocks');
  await page.getByRole('button', { name: /Reload/, exact: false }).click();
  assert.equal((await refreshed).status(), 200);
  await page.waitForFunction(() => !document.querySelector('.sidebar-status'));
  assert.equal(await nameInput().inputValue(), 'Unsaved conflict draft');
  await page.locator('.btn-revert').click();
  await page.waitForFunction(() => document.querySelector('.properties-body input')?.value === 'External saved change');
  await settled();
  check('reload retains the conflict draft until explicit Revert restores the current server version');

  await select(vanilla);
  await waitMutation('PUT', `/api/blocks/${vanilla.id}`, () => page.locator('.btn-override').click());
  await settled(); assert.equal((await readBlock(vanilla.id)).isCustom, true);
  await waitMutation('DELETE', `/api/blocks/${vanilla.id}`, () => page.locator('.btn-delete').click());
  await settled();
  const revealed = await readBlock(vanilla.id);
  assert.equal(revealed.isCustom, false); assert.equal(revealed.name, vanilla.name); assert.equal(revealed.hp, vanilla.hp);
  assert.equal(await nameInput().inputValue(), vanilla.name);
  check('vanilla override and deletion reveal the original definition immediately');

  const iconBefore = Buffer.from(await (await api.get(`${origin}/api/textures/icon/${vanilla.icon}`)).body());
  console.log('Icon original read');
  const patch = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 231, g: 17, b: 199, alpha: 1 } } }).png().toBuffer();
  await waitMutation('PUT', `/api/textures/icon/${vanilla.icon}`, () => page.locator('.icon-field input[type=file]').setInputFiles({ name: 'recipe-icon.png', mimeType: 'image/png', buffer: patch }));
  console.log('Icon upload response received');
  const changed = await sharp(Buffer.from(await (await api.get(`${origin}/api/textures/icon/${vanilla.icon}`)).body())).raw().toBuffer();
  assert.deepEqual([...changed.subarray(0, 4)], [231, 17, 199, 255]);
  console.log('Imported icon pixels verified');
  await waitMutation('POST', `/api/textures/icon/${vanilla.icon}/restore`, () => page.getByRole('button', { name: 'Restore original icon', exact: true }).click());
  console.log('Icon restoration response received');
  const restored = Buffer.from(await (await api.get(`${origin}/api/textures/icon/${vanilla.icon}`)).body());
  assert.deepEqual(await sharp(restored).ensureAlpha().raw().toBuffer(), await sharp(iconBefore).ensureAlpha().raw().toBuffer());
  assert(fs.readdirSync(path.join(game, 'customBlockTextures/.blockeditor-icon-backups')).length > 0);
  check('icon import, backed-up write and exact original slot restoration', { icon: vanilla.icon });

  const wedges = initial.filter(block => !block.isDeprecated && block.blockStyle === 1 && !block.transparency && !block.animated && !block.extraProperties.LodShape);
  const nonCube = wedges.find(block => block.id === 293) ?? wedges[0];
  assert(nonCube, 'A native wedge is needed for the generated-icon recipe.');
  await select(nonCube);
  const originalGeneratedSlot = Buffer.from(await (await api.get(`${origin}/api/textures/icon/${nonCube.icon}`)).body());
  const generate = page.getByRole('button', { name: 'Generate from block', exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Generate from block' && !button.disabled));
  await generate.click();
  const generatedImage = page.getByRole('img', { name: 'Generated icon preview', exact: true });
  await generatedImage.waitFor();
  const encoded = await generatedImage.evaluate(async image => {
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const generatedPng = Buffer.from(encoded, 'base64');
  const generatedPixels = await sharp(generatedPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(generatedPixels.info.width, 64); assert.equal(generatedPixels.info.height, 64);
  const alpha = generatedPixels.data.filter((_value, index) => index % 4 === 3);
  const occupied = alpha.filter(value => value > 0).length;
  assert(occupied > 64 && occupied < 4096, `Expected a visible wedge and transparent background, got ${occupied} pixels.`);
  assert(new Set(generatedPixels.data).size > 8, 'Generated icon has no material detail.');
  fs.writeFileSync(path.join(receipt, 'generated-noncube.png'), generatedPng);
  fs.writeFileSync(path.join(receipt, 'original-noncube-icon.png'), originalGeneratedSlot);
  await page.screenshot({ path: path.join(receipt, 'generated-preview.png'), timeout: 10000 });
  await waitMutation('PUT', `/api/textures/icon/${nonCube.icon}`, () => page.getByRole('button', { name: 'Apply icon', exact: true }).click());
  const applied = Buffer.from(await (await api.get(`${origin}/api/textures/icon/${nonCube.icon}`)).body());
  assert.deepEqual(await sharp(applied).ensureAlpha().raw().toBuffer(), generatedPixels.data);
  await waitMutation('POST', `/api/textures/icon/${nonCube.icon}/restore`, () => page.getByRole('button', { name: 'Restore original icon', exact: true }).click());
  const generatedRestored = Buffer.from(await (await api.get(`${origin}/api/textures/icon/${nonCube.icon}`)).body());
  assert.deepEqual(await sharp(generatedRestored).ensureAlpha().raw().toBuffer(), await sharp(originalGeneratedSlot).ensureAlpha().raw().toBuffer());
  check('native non-cube generation, preview, application and exact icon restoration', { id: nonCube.id, icon: nonCube.icon, occupied });

  await select(await readBlock(created.id));
  await waitMutation('DELETE', `/api/blocks/${created.id}`, () => page.locator('.btn-delete').click());
  await settled();
  assert.equal((await api.get(`${origin}/api/blocks/${created.id}`)).status(), 404);
  check('custom deletion persists');

  const mobileLocales = {
    fr: { navigation: 'Panneaux de l’éditeur', blocks: 'Blocs', preview: 'Aperçu', properties: 'Propriétés', create: '+ Nouveau bloc', generate: 'Créer depuis le bloc', generated: 'Aperçu de l’icône créée', pick: 'Choisir…', icons: 'Icônes de construction', atlas: 'Gestionnaire d\'atlas personnalisé', manage: 'Gérer l\'atlas personnalisé…', close: 'Fermer' },
    en: { navigation: 'Editor panels', blocks: 'Blocks', preview: 'Preview', properties: 'Properties', create: '+ New Block', generate: 'Generate from block', generated: 'Generated icon preview', pick: 'Pick…', icons: 'Build Icons', atlas: 'Custom atlas manager', manage: 'Manage custom atlas…', close: 'Close' },
  };
  for (const [locale, words] of Object.entries(mobileLocales)) {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.locator('.app-header select').filter({ has: page.locator('option[value="ja"]') }).selectOption(locale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('.block-card');
    await page.getByRole('tablist', { name: words.navigation, exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('smbe-locale')), locale);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The mobile viewport must not scroll horizontally.');
    for (const label of [words.blocks, words.preview, words.properties]) assert.equal(await page.getByRole('tab', { name: label, exact: true }).count(), 1);

    // Create from the initial Blocks panel, then open Properties directly. The
    // native capture must also work before the user has opened the Preview tab.
    const mobileCreated = await waitMutation('POST', '/api/blocks', () => page.getByRole('button', { name: words.create, exact: true }).click(), 201);
    await page.getByRole('tab', { name: words.properties, exact: true }).click();
    await page.waitForFunction(label => [...document.querySelectorAll('button')].some(button => button.textContent === label && !button.disabled), words.generate);
    await page.getByRole('button', { name: words.generate, exact: true }).click();
    await page.getByRole('img', { name: words.generated, exact: true }).waitFor();
    await nameInput().fill(`Mobile ${locale.toUpperCase()} ${mobileCreated.id}`);
    await waitMutation('PUT', `/api/blocks/${mobileCreated.id}`, () => saveButton().click());
    await settled();
    assert.equal((await readBlock(mobileCreated.id)).name, `Mobile ${locale.toUpperCase()} ${mobileCreated.id}`);

    const iconOpener = page.getByRole('button', { name: words.pick, exact: true });
    await iconOpener.click();
    const iconDialog = page.getByRole('dialog', { name: words.icons, exact: true });
    await iconDialog.waitFor();
    const iconBounds = await iconDialog.boundingBox();
    assert(iconBounds && iconBounds.x >= 0 && iconBounds.x + iconBounds.width <= 391, 'Icon dialog must fit the mobile viewport.');
    await iconDialog.getByRole('button', { name: words.close, exact: true }).click();
    assert.equal(await iconOpener.evaluate(element => element === document.activeElement), true);

    await page.getByRole('tab', { name: words.preview, exact: true }).click();
    await page.getByRole('button', { name: words.manage, exact: true }).click();
    const atlasDialog = page.getByRole('dialog', { name: words.atlas, exact: true });
    await atlasDialog.waitFor();
    const atlasBounds = await atlasDialog.boundingBox();
    assert(atlasBounds && atlasBounds.x >= 0 && atlasBounds.x + atlasBounds.width <= 391, 'Atlas dialog must fit the mobile viewport.');
    await atlasDialog.getByRole('button', { name: words.close, exact: true }).click();
    await page.screenshot({ path: path.join(receipt, `mobile-${locale}.png`), timeout: 10000 });
    await page.getByRole('tab', { name: words.properties, exact: true }).click();
    assert.equal(await nameInput().inputValue(), `Mobile ${locale.toUpperCase()} ${mobileCreated.id}`);
    await waitMutation('DELETE', `/api/blocks/${mobileCreated.id}`, () => page.locator('.btn-delete').click());
    await settled();
    assert.equal((await api.get(`${origin}/api/blocks/${mobileCreated.id}`)).status(), 404);
    check('mobile layout, retained locale, direct Properties capture, editing and accessible dialogs', { locale, width: 390, height: 844 });
  }
  assert.deepEqual(fs.readFileSync(path.join(game, 'data/config/BlockConfig.xml')), fs.readFileSync(path.join(source, 'data/config/BlockConfig.xml')));
  assert.deepEqual(fs.readFileSync(path.join(game, 'data/config/BlockTypes.properties')), fs.readFileSync(path.join(source, 'data/config/BlockTypes.properties')));
  assert.equal(report.pageErrors.length, 0, JSON.stringify(report.pageErrors));
  await page.screenshot({ path: path.join(receipt, 'final.png') });
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = error.stack;
  console.error(error);
  if (page) { try { await page.screenshot({ path: path.join(receipt, 'failure.png'), timeout: 5000 }); report.body = await page.locator('body').innerText({ timeout: 5000 }); report.focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, text: document.activeElement?.textContent?.slice(0, 160) })); } catch {} }
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  process.chdir(oldCwd);
  if (oldFixed === undefined) delete process.env.EDITOR_FIXED_STARMADE_DIR; else process.env.EDITOR_FIXED_STARMADE_DIR = oldFixed;
  report.sourceAfter = fingerprint();
  if (report.sourceBefore !== report.sourceAfter) { report.status = 'FAIL'; report.sourceChanged = true; process.exitCode = 1; }
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.writeFileSync(path.join(receipt, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${report.status}: ${path.join(receipt, 'report.json')}`);
  if (report.error) console.error(report.error);
}
