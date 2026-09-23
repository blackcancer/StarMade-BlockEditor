import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyVendor } from './check-vendor.mjs';

test('accepts pinned archives and rejects any modified bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'blockeditor-vendor-gate-'));
  try {
    mkdirSync(join(root, 'vendor'));
    const bytes = Buffer.from('an immutable package');
    const packages = ['starmade-3d', 'starmade-decoder'].map(name => ({ name, commit: 'a'.repeat(40), file: name + '.tgz', sha256: createHash('sha256').update(bytes).digest('hex') }));
    for (const entry of packages) writeFileSync(join(root, 'vendor', entry.file), bytes);
    writeFileSync(join(root, 'vendor/manifest.json'), JSON.stringify({ packages }));
    assert.equal(verifyVendor(root), 2);
    writeFileSync(join(root, 'vendor', packages[0].file), 'tampered');
    assert.throws(() => verifyVendor(root), /digest/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
