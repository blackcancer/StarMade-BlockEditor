/** Verify that installed local SDK archives match their reviewed source provenance. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

/** Validate the pinned Decoder and renderer bytes before builds or distribution. */
export function verifyVendor(root = process.cwd()) {
  const manifest = JSON.parse(readFileSync(join(root, 'vendor/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.packages.map(p => p.name).sort(), ['starmade-3d', 'starmade-decoder']);
  for (const entry of manifest.packages) {
    assert.match(entry.commit, /^[a-f0-9]{40}$/);
    assert.equal(entry.file, basename(entry.file));
    const digest = createHash('sha256').update(readFileSync(join(root, 'vendor', entry.file))).digest('hex');
    assert.equal(digest, entry.sha256, `${entry.name}: archive digest mismatch`);
  }
  return manifest.packages.length;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(`${verifyVendor()} pinned SDK archives verified.`);
}
