/** Real production-UI checks for the native Display pass; no installation mutations. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Observe React's existing native scene without replacing application rendering code. */
export async function observeNativePreview(page) {
  await page.addInitScript(() => {
    const roots = new Set(); let id = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject: () => ++id,
      onCommitFiberRoot: (_, root) => roots.add(root), onCommitFiberUnmount() {} };
    window.__nativeControls = undefined;
    window.__nativePreview = () => {
      let found; const seen = new Set();
      function visit(fiber) {
        if (!fiber || seen.has(fiber)) return; seen.add(fiber);
        const object = fiber.memoizedProps?.object;
        if (object?.target?.isVector3 && object.object?.isCamera) window.__nativeControls = object;
        if (object?.name === 'native-block-preview' && object.parent) found = object;
        visit(fiber.child); visit(fiber.sibling);
      }
      for (const root of roots) visit(root.current);
      return found;
    };
  });
}

/** Assert screen and glyph pixels on each native face, plus actual UI PNG generation. */
export async function checkDisplayPreview(page, origin, receipt) {
  const response = await page.request.get(`${origin}/api/blocks/479`);
  assert.equal(response.status(), 200);
  const block = await response.json();
  await page.locator('.sidebar-search input').fill(block.xmlTypeName);
  await page.locator('.block-card').first().click();
  const observations = [];
  for (let orientation = 0; orientation < 6; orientation++) {
    await page.locator('.orientation-row select').selectOption(String(orientation));
    await page.waitForFunction(value => {
      const object = window.__nativePreview();
      return object?.userData.starMadePreview.blockId === 479 && object.userData.starMadePreview.orientation === value
        && object.getObjectByName('StarMade display 479');
    }, orientation);
    const result = await page.evaluate(async orientation => {
      const object = window.__nativePreview(), state = object.__r3f.root.getState();
      const panel = object.getObjectByName('StarMade display 479');
      const camera = state.camera;
      const controls = window.__nativeControls; controls.enabled = false;
      const eye = camera.position.clone(), up = camera.up.clone();
      const axes = [[0,0,1],[0,0,-1],[0,1,0],[0,-1,0],[-1,0,0],[1,0,0]];
      camera.position.set(...axes[orientation]).multiplyScalar(2.6);
      camera.up.set(0, orientation === 2 || orientation === 3 ? 0 : 1, orientation === 2 || orientation === 3 ? 1 : 0);
      camera.lookAt(0,0,0); camera.updateMatrixWorld();
      // Let the application's frame callback update its native shader uniforms.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const gl = state.gl.getContext();
      const program = state.gl.properties.get(panel.children[0].material).currentProgram.program;
      const clock = () => gl.getUniform(program, gl.getUniformLocation(program, 'uTime'));
      const beforeTime = clock();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterTime = clock();
      const scene = state.scene.clone(false); scene.add(object.clone(true));
      const screen = scene.getObjectByName('StarMade display 479');
      const draw = () => { state.gl.render(scene, camera); return state.gl.domElement.toDataURL('image/png'); };
      const full = draw(); screen.children[1].visible = false; const noText = draw();
      screen.visible = false; const cube = draw();
      const result = { full, noText, cube, orientation, beforeTime, afterTime, font: document.fonts.check('16px StarMadeDisplay'),
        cubeShader: object.getObjectByName('native-block-mesh').material.type,
        screenMaterial: panel.children[0].material.type,
        screenTexture: panel.children[0].material.map.image.src,
        panelMatrix: panel.matrix.toArray(), error: gl.getError(), linked: state.gl.info.programs.every(p => gl.getProgramParameter(p.program, gl.LINK_STATUS)) };
      camera.position.copy(eye); camera.up.copy(up); camera.lookAt(0,0,0); camera.updateMatrixWorld();
      controls.enabled = true;
      return result;
    }, orientation);
    const decode = data => Buffer.from(data.split(',')[1], 'base64');
    const full = await sharp(decode(result.full)).ensureAlpha().raw().toBuffer();
    const noText = await sharp(decode(result.noText)).ensureAlpha().raw().toBuffer();
    const cube = await sharp(decode(result.cube)).ensureAlpha().raw().toBuffer();
    let screenPixels = 0, textPixels = 0;
    for (let index = 0; index < full.length; index += 4) {
      if ([0,1,2].some(c => Math.abs(full[index+c] - cube[index+c]) > 8)) screenPixels++;
      if ([0,1,2].some(c => Math.abs(full[index+c] - noText[index+c]) > 8)) textPixels++;
    }
    assert(screenPixels > 100, `Display screen pixels for orientation ${orientation}: ${screenPixels}`);
    assert(textPixels > 5, `Display text pixels for orientation ${orientation}: ${textPixels}`);
    assert.equal(typeof result.beforeTime, 'number');
    assert(result.afterTime > result.beforeTime, 'Native Display scanline clock must advance');
    assert.equal(result.error, 0); assert.equal(result.linked, true); assert.equal(result.font, true);
    assert.equal(result.cubeShader, 'ShaderMaterial'); assert.equal(result.screenMaterial, 'MeshBasicMaterial');
    assert.match(result.screenTexture, /\/display\/screen$/);
    fs.writeFileSync(path.join(receipt, `display-${orientation}.png`), decode(result.full));
    const { full: _, noText: __, cube: ___, ...details } = result;
    observations.push({ ...details, screenPixels, textPixels });
  }
  await page.locator('.orientation-row select').selectOption('0');
  await page.waitForFunction(() => window.__nativePreview()?.userData.starMadePreview.orientation === 0);
  await page.getByRole('button', { name: 'Generate from block', exact: true }).click();
  const image = page.locator('.generated-icon-preview img');
  await image.waitFor();
  const encoded = await image.evaluate(async image => {
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const icon = Buffer.from(encoded, 'base64');
  const metadata = await sharp(Buffer.from(icon)).metadata();
  assert.equal(metadata.width, 64); assert.equal(metadata.height, 64); assert.equal(metadata.hasAlpha, true);
  fs.writeFileSync(path.join(receipt, 'display-icon.png'), Buffer.from(icon));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('[role="alert"]').count(), 0);
  await page.locator('.sidebar-search input').fill('SHIP_CORE');
  await page.locator('.block-card').first().click();
  await page.waitForFunction(() => window.__nativePreview()?.userData.starMadePreview.blockId === 1);
  assert.equal(await page.evaluate(() => [...document.fonts].filter(font => font.family === 'StarMadeDisplay').length), 0);
  assert.equal(await page.evaluate(() => !!window.__nativePreview().getObjectByName('StarMade display 479')), false);
  fs.writeFileSync(path.join(receipt, 'display.json'), JSON.stringify(observations, null, 2));
  return observations;
}
