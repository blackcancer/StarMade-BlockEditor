#!/usr/bin/env node
/**
 * Documentation coverage check for production TypeScript sources.
 *
 * The production documentation policy is intentionally simple and enforceable:
 * every non-test TS/TSX file under client/src or server/src must have a
 * file-level JSDoc overview, and every exported declaration must be immediately
 * preceded by a JSDoc block. This catches undocumented public API surfaces while
 * avoiding noisy requirements on private implementation details and test cases.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCE_DIRS = ['client/src', 'server/src'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const TEST_RE = /\.test\.tsx?$/;
const EXPORT_RE = /^\s*export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z0-9_]+)/gm;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) && !TEST_RE.test(entry.name)) out.push(full);
  }
  return out;
}

function hasFileOverview(source) {
  const head = source.slice(0, 1400);
  return /@fileoverview|\/\*\*[\s\S]*?\*\/\s*(?:import|export|const|interface|type|function)/.test(head);
}

function hasImmediateJsdocBefore(source, index) {
  const before = source.slice(0, index);
  const trimmedEnd = before.search(/\s*$/);
  const meaningfulPrefix = before.slice(0, trimmedEnd);
  if (!meaningfulPrefix.endsWith('*/')) return false;
  const start = meaningfulPrefix.lastIndexOf('/**');
  return start !== -1 && meaningfulPrefix.slice(start).startsWith('/**');
}

const issues = [];
const files = SOURCE_DIRS.flatMap(dir => walk(path.join(ROOT, dir))).sort();

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  if (!hasFileOverview(source)) {
    issues.push(`${rel}: missing file-level JSDoc overview`);
  }

  let match;
  while ((match = EXPORT_RE.exec(source))) {
    if (!hasImmediateJsdocBefore(source, match.index)) {
      issues.push(`${rel}: exported declaration "${match[1]}" is missing JSDoc`);
    }
  }
}

if (issues.length > 0) {
  console.error('Documentation coverage check failed:');
  for (const issue of issues) console.error(` - ${issue}`);
  process.exit(1);
}

console.log(`Documentation coverage check passed (${files.length} production source files).`);
