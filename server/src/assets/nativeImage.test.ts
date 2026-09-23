import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { findNativeImage, readNativePng, replacePixels, hasNativeAlpha, resizeNormalPng } from './nativeImage.js';

function tga(rgba: number[]): Buffer {
  const header = Buffer.alloc(18); header[2] = 2; header.writeUInt16LE(1, 12); header.writeUInt16LE(1, 14); header[16] = 32; header[17] = 40;
  return Buffer.concat([header, Buffer.from([rgba[2], rgba[1], rgba[0], rgba[3]])]);
}

describe('native material image decoding', () => {
  let root: string;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-images-')); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });
  it('resizes zero-alpha material RGB without erasing it, and supplies zero alpha for RGB imports', async () => {
    for (const channels of [3, 4] as const) {
      const pixel = channels === 3 ? [128, 128, 255] : [128, 128, 255, 0];
      const input = await sharp(Buffer.from(pixel), { raw: { width: 1, height: 1, channels } }).png().toBuffer();
      const resized = await resizeNormalPng(input, 2);
      expect([...await sharp(resized).raw().toBuffer()]).toEqual(Array(4).fill([128, 128, 255, 0]).flat());
    }
  });
  it('prefers TGA material channels and otherwise resolves uncompressed or zipped images', async () => {
    const png = await sharp(Buffer.from([1, 2, 3, 255]), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(path.join(root, 't000_NRM.png'), png);
    fs.writeFileSync(path.join(root, 't000_NRM.tga.zip'), zipSync({ 't000_NRM.tga': tga([20, 30, 40, 64]) }));
    const source = findNativeImage(root, 't000_NRM.png', true)!;
    expect(source.path).toMatch(/tga.zip$/);
    expect([...await sharp(await readNativePng(source)).raw().toBuffer()]).toEqual([20, 30, 40, 64]);
    expect(findNativeImage(root, 't000_NRM.png')?.path).toMatch(/NRM.png$/);
    fs.unlinkSync(path.join(root, 't000_NRM.tga.zip'));
    expect(await readNativePng(findNativeImage(root, 't000_NRM.png', true)!)).toEqual(png);
    fs.writeFileSync(path.join(root, 't001.png.zip'), zipSync({ 'nested/t001.png': png }));
    expect(await readNativePng(findNativeImage(root, 't001.png')!)).toEqual(png);
    fs.writeFileSync(path.join(root, 't002.tga'), tga([30, 40, 50, 70]));
    expect([...await sharp(await readNativePng(findNativeImage(root, 't002.png', true)!)).raw().toBuffer()]).toEqual([30, 40, 50, 70]);
    expect(findNativeImage(root, 'missing.png')).toBeNull();
  });

  it('rejects malformed archives and oversized or malformed TGA before allocation', async () => {
    const file = path.join(root, 'bad.tga.zip');
    fs.writeFileSync(file, zipSync({ 'wrong.txt': Buffer.from('x') }));
    await expect(readNativePng({ path: file, encoding: 'tga', zipped: true })).rejects.toThrow('one image');
    fs.writeFileSync(file, zipSync({ 'a/bad.tga': tga([1, 2, 3, 4]), 'b/bad.tga': tga([5, 6, 7, 8]) }));
    await expect(readNativePng({ path: file, encoding: 'tga', zipped: true })).rejects.toThrow('one image');
    fs.writeFileSync(file, Buffer.from('not zip'));
    await expect(readNativePng({ path: file, encoding: 'tga', zipped: true })).rejects.toThrow();
    const plain = path.join(root, 'bad.tga');
    fs.writeFileSync(plain, Buffer.alloc(2));
    await expect(readNativePng({ path: plain, encoding: 'tga', zipped: false })).rejects.toThrow('TGA');
    const header = tga([1, 2, 3, 4]); header.writeUInt16LE(65535, 12); header.writeUInt16LE(65535, 14);
    fs.writeFileSync(plain, header);
    await expect(readNativePng({ path: plain, encoding: 'tga', zipped: false })).rejects.toThrow('dimensions');
  });

  it('replaces RGBA exactly without compositing away transparent RGB or alpha', async () => {
    const base = await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 128, g: 128, b: 255, alpha: 1 } } }).png().toBuffer();
    const replacement = await sharp(Buffer.from([20, 30, 40, 64]), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    const output = await replacePixels(base, replacement, 1, 0);
    const pixels = [...await sharp(output).raw().toBuffer()];
    expect(pixels.slice(0, 4)).toEqual([128, 128, 255, 255]);
    expect(pixels.slice(4, 8)).toEqual([20, 30, 40, 64]);
    expect(pixels.slice(8)).toEqual([128, 128, 255, 255, 128, 128, 255, 255]);
    await expect(replacePixels(base, replacement, -1, 0)).rejects.toThrow('bounds');
    await expect(replacePixels(base, replacement, 0, 2)).rejects.toThrow('bounds');
  });
  it('rejects excessive byte sizes before reading and refuses mislabeled PNG content', async () => {
    const file = path.join(root, 'huge.png'); fs.writeFileSync(file, ''); fs.truncateSync(file, 80 * 1024 * 1024 + 1);
    await expect(readNativePng({ path: file, encoding: 'png', zipped: false })).rejects.toThrow('byte limit');
    const jpeg = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).jpeg().toBuffer();
    fs.writeFileSync(file, jpeg);
    await expect(readNativePng({ path: file, encoding: 'png', zipped: false })).rejects.toThrow('Expected a PNG');
  });

  it('uses zero material alpha only when an RGB normal image has no native alpha channel', async () => {
    const file = path.join(root, 'custom_NRM.png');
    fs.writeFileSync(file, await sharp(Buffer.from([20, 30, 40]), { raw: { width: 1, height: 1, channels: 3 } }).png().toBuffer());
    const source = findNativeImage(root, 'custom_NRM.png', true)!;
    expect(await hasNativeAlpha(source)).toBe(false);
    expect([...await sharp(await readNativePng(source)).raw().toBuffer()]).toEqual([20, 30, 40, 0]);
    expect((await sharp(await readNativePng(findNativeImage(root, 'custom_NRM.png')!)).metadata()).channels).toBe(3);
    const rgbTga = tga([20, 30, 40, 255]).subarray(0, 21); rgbTga[16] = 24; rgbTga[17] = 32;
    fs.writeFileSync(path.join(root, 'custom_NRM.tga'), rgbTga);
    const tgaSource = findNativeImage(root, 'custom_NRM.png', true)!;
    expect(await hasNativeAlpha(tgaSource)).toBe(false);
    expect([...await sharp(await readNativePng(tgaSource)).raw().toBuffer()]).toEqual([20, 30, 40, 0]);
    fs.writeFileSync(path.join(root, 'custom_NRM.tga'), tga([20, 30, 40, 64]));
    expect(await hasNativeAlpha(tgaSource)).toBe(true);
    expect([...await sharp(await readNativePng(tgaSource)).raw().toBuffer()]).toEqual([20, 30, 40, 64]);
  });

});
