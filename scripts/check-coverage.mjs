/** Exact, per-source delivery gate, independent of rounded reporter percentages. */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Collect runtime TypeScript sources, including application entry points. */
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return sources(file);
    return /\.tsx?$/.test(file) && !/\.test\.tsx?$|\.d\.ts$/.test(file) ? [file] : [];
  });
}

/** Fail closed on missing source entries, skipped code or incomplete exact counters. */
export function verifyCoverage(root = process.cwd()) {
  const issues = [];
  let files = 0;
  for (const workspace of ['server', 'client']) {
    const report = JSON.parse(readFileSync(join(root, workspace, 'coverage/coverage-summary.json'), 'utf8'));
    for (const file of sources(join(root, workspace, 'src'))) {
      files++;
      if (/(?:c8|v8|istanbul)\s+ignore/.test(readFileSync(file, 'utf8'))) issues.push(`${file}: coverage ignore is forbidden`);
      const entry = report[resolve(file)];
      if (!entry) { issues.push(`${file}: missing from report`); continue; }
      for (const metric of ['lines', 'branches']) {
        const counters = entry[metric];
        if (!counters || !Number.isSafeInteger(counters.total) || counters.total < 0 ||
            counters.covered !== counters.total || counters.skipped !== 0) {
          issues.push(`${file}: ${metric} are not exactly 100% without skipped entries`);
        }
      }
    }
  }
  if (issues.length) throw new Error(issues.join('\n'));
  return { files, lines: '100% per file', branches: '100% per file', missing: 0, skipped: 0 };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(verifyCoverage(), null, 2));
}
