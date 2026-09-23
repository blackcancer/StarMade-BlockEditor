/** @fileoverview Decodes native PNG/TGA archives and preserves RGBA material channels exactly. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { unzipSync } from 'fflate';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { AssetError, confinedPath } from './assetPaths.js';

const MAX_BYTES = 80 * 1024 * 1024;
const MAX_PIXELS = 4096 * 4096;

/** A selected installation image; archives are decoded in memory and never extracted. */
export interface NativeImage { path: string; encoding: 'png' | 'tga'; zipped: boolean; normal?: boolean }

/** Resolve normal material data from TGA first; color atlases prefer their PNG source. */
export function findNativeImage(root: string, pngName: string, normal = false): NativeImage | null {
  if (!fs.existsSync(root)) return null;
  const stem = pngName.slice(0, -4);
  const choices = normal
    ? [`${stem}.tga.zip`, `${stem}.tga`, pngName, `${pngName}.zip`]
    : [pngName, `${pngName}.zip`, `${stem}.tga.zip`, `${stem}.tga`];
  for (const name of choices) {
    const file = confinedPath(root, name);
    if (fs.existsSync(file)) return { path: file, encoding: name.includes('.tga') ? 'tga' : 'png', zipped: name.endsWith('.zip'), normal };
  }
  return null;
}

function readImageBytes(source: NativeImage): Buffer {
  if (fs.statSync(source.path).size > MAX_BYTES) throw new AssetError('Native image exceeds the byte limit.');
  let input = fs.readFileSync(source.path);
  if (source.zipped) {
    const expected = path.basename(source.path, '.zip');
    const entries = Object.values(unzipSync(input, {
      filter: entry => path.posix.basename(entry.name) === expected && entry.originalSize <= MAX_BYTES,
    }));
    if (entries.length !== 1) throw new AssetError('Native archive must contain exactly one image with the expected name.');
    input = Buffer.from(entries[0]);
  }
  return input;
}

/** Inspect whether native material alpha exists without decoding all image pixels. */
export async function hasNativeAlpha(source: NativeImage): Promise<boolean> {
  const input = readImageBytes(source);
  if (source.encoding === 'png') return Boolean((await sharp(input).metadata()).hasAlpha);
  return input[16] === 32 || Boolean(input[17] & 15);
}

/** Read native PNG bytes, supplying zero material alpha only for normals lacking that channel. */
export async function readNativePng(source: NativeImage): Promise<Buffer> {
  const input = readImageBytes(source);
  if (source.encoding === 'png') {
    const metadata = await sharp(input).metadata();
    if (metadata.format !== 'png') throw new AssetError('Expected a PNG image.');
    if (source.normal && !metadata.hasAlpha) return sharp(input).ensureAlpha(0).png().toBuffer();
    return input;
  }
  if (input.length < 18) throw new AssetError('Invalid TGA header.');
  const width = input.readUInt16LE(12);
  const height = input.readUInt16LE(14);
  if (!width || !height || width * height > MAX_PIXELS) throw new AssetError('Invalid TGA dimensions.');
  const decoded = new TGALoader().parse(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer) as unknown as { data: Uint8Array; width: number; height: number };
  if (source.normal && input[16] !== 32 && !(input[17] & 15)) {
    for (let index = 3; index < decoded.data.length; index += 4) decoded.data[index] = 0;
  }
  return sharp(decoded.data, { raw: { width: decoded.width, height: decoded.height, channels: 4 } }).png().toBuffer();
}

/** Resize normal RGB and material alpha independently, avoiding opacity premultiplication. */
export async function resizeNormalPng(input: Buffer, size: number): Promise<Buffer> {
  const decoded = await sharp(input).toColourspace('srgb').ensureAlpha(0).raw().toBuffer({ resolveWithObject: true });
  const pixels = decoded.info.width * decoded.info.height;
  const rgb = Buffer.alloc(pixels * 3);
  const alpha = Buffer.alloc(pixels);
  for (let pixel = 0; pixel < pixels; pixel++) {
    decoded.data.copy(rgb, pixel * 3, pixel * 4, pixel * 4 + 3);
    alpha[pixel] = decoded.data[pixel * 4 + 3];
  }
  const resizedRgb = await sharp(rgb, { raw: { width: decoded.info.width, height: decoded.info.height, channels: 3 } }).resize(size, size, { fit: 'cover' }).raw().toBuffer();
  const resizedAlpha = await sharp(alpha, { raw: { width: decoded.info.width, height: decoded.info.height, channels: 1 } }).resize(size, size, { fit: 'cover' }).extractChannel(0).raw().toBuffer();
  return sharp(resizedRgb, { raw: { width: size, height: size, channels: 3 } }).joinChannel(resizedAlpha, { raw: { width: size, height: size, channels: 1 } }).png().toBuffer();
}

/** Replace rectangular RGBA pixels, including zero-alpha RGB, instead of compositing over them. */
export async function replacePixels(base: Buffer, patch: Buffer, left: number, top: number): Promise<Buffer> {
  const original = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const replacement = await sharp(patch).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (left < 0 || top < 0 || left + replacement.info.width > original.info.width || top + replacement.info.height > original.info.height) {
    throw new AssetError('Image replacement exceeds destination bounds.');
  }
  for (let row = 0; row < replacement.info.height; row++) {
    const sourceOffset = row * replacement.info.width * 4;
    replacement.data.copy(original.data, ((top + row) * original.info.width + left) * 4, sourceOffset, sourceOffset + replacement.info.width * 4);
  }
  return sharp(original.data, { raw: { width: original.info.width, height: original.info.height, channels: 4 } }).png().toBuffer();
}
