import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyCoverage } from './check-coverage.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'blockeditor-coverage-gate-'));
  for (const workspace of ['server', 'client']) {
    mkdirSync(join(root, workspace, 'src'), { recursive: true });
    mkdirSync(join(root, workspace, 'coverage'));
    const source = join(root, workspace, 'src', 'entry.ts');
    writeFileSync(source, 'export const value = 1;\n');
    writeFileSync(join(root, workspace, 'coverage', 'coverage-summary.json'), JSON.stringify({
      [source]: { lines: { total: 1, covered: 1, skipped: 0, pct: 100 }, branches: { total: 0, covered: 0, skipped: 0, pct: 100 } },
    }));
  }
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('accepts exact coverage of every source including entry points', () => fixture(root => {
  assert.equal(verifyCoverage(root).files, 2);
}));
test('rejects an unreported production source', () => fixture(root => {
  writeFileSync(join(root, 'server/src/missing.ts'), 'export const missing = 1;');
  assert.throws(() => verifyCoverage(root), /missing.ts/);
}));
test('rejects rounded percentages and skipped counters', () => fixture(root => {
  const file = join(root, 'server/src/entry.ts');
  for (const metric of [{ total: 10001, covered: 10000, skipped: 0, pct: 100 }, { total: 1, covered: 1, skipped: 1, pct: 100 }]) {
    writeFileSync(join(root, 'server/coverage/coverage-summary.json'), JSON.stringify({ [file]: { lines: metric, branches: metric } }));
    assert.throws(() => verifyCoverage(root), /entry.ts/);
  }
}));
test('rejects coverage ignores even when reports claim full coverage', () => fixture(root => {
  writeFileSync(join(root, 'client/src/entry.ts'), '/* c8 ignore next */\nexport const value = 1;');
  assert.throws(() => verifyCoverage(root), /ignore/);
}));
test('does not treat tests or declaration-only files as runtime sources', () => fixture(root => {
  writeFileSync(join(root, 'client/src/test.test.tsx'), '/* c8 ignore next */');
  writeFileSync(join(root, 'client/src/global.d.ts'), 'declare const value: number;');
  assert.equal(verifyCoverage(root).files, 2);
}));
