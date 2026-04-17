#!/usr/bin/env node
// Copies non-TS assets (like SKILL.md) into dist/ after `tsc`.
// `tsc` only emits JS, so markdown/json assets must be copied by hand to keep
// them alongside the compiled modules that read them via `import.meta.url`.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(thisFile), '..');

const assets = [
  {
    from: join(repoRoot, 'src', 'skill', 'SKILL.md'),
    to: join(repoRoot, 'dist', 'skill', 'SKILL.md'),
  },
];

let failed = 0;
for (const { from, to } of assets) {
  try {
    if (!existsSync(from)) {
      console.warn(`[copy-assets] skip — source missing: ${from}`);
      continue;
    }
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    console.log(`[copy-assets] ${from} → ${to}`);
  } catch (err) {
    failed += 1;
    console.error(`[copy-assets] failed: ${from} → ${to}: ${err instanceof Error ? err.message : err}`);
  }
}

if (failed > 0) {
  process.exit(1);
}
