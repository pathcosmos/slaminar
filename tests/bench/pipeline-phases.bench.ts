/**
 * Per-phase library benchmarks (Phase Q5).
 *
 * Unlike the CLI wall-time runner in `scripts/bench-cli.mjs`, these exercise
 * slaminar's TS functions in-process so individual pipeline stages (scan /
 * analyze / recommend) can be compared separately — giving us the breakdown
 * needed to identify the Top 3 bottlenecks.
 *
 * Run with: E2E=0 vitest bench tests/bench/
 * (vitest.config.ts excludes bench paths from unit runs.)
 */

import { afterAll, bench, beforeAll, describe } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { scan } from '../../src/core/scanner.js';
import { analyze } from '../../src/core/pipeline.js';
import { recommend } from '../../src/recommender/recommender.js';

function writeFile(root: string, rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function seedSmall(root: string): void {
  mkdirSync(root, { recursive: true });
  writeFile(
    root,
    'package.json',
    JSON.stringify({ name: 'b-s', version: '0.1.0', type: 'module' }),
  );
  writeFile(root, 'README.md', '# bench\n');
  for (let i = 0; i < 18; i++) writeFile(root, `src/m_${i}.ts`, `export const v = ${i};\n`);
}

function seedMedium(root: string): void {
  mkdirSync(root, { recursive: true });
  writeFile(root, 'pyproject.toml', `[project]\nname = "b-m"\nversion = "0.1.0"\n`);
  for (const p of ['api', 'worker', 'shared']) {
    for (let i = 0; i < 150; i++) {
      writeFile(root, `packages/${p}/src/${p}/m_${i}.py`, `def h(): return ${i}\n`);
    }
  }
}

function seedLarge(root: string): void {
  mkdirSync(root, { recursive: true });
  writeFile(root, 'package.json', JSON.stringify({ name: 'b-l', version: '0.1.0' }));
  for (let p = 0; p < 20; p++) {
    for (let f = 0; f < 100; f++) {
      writeFile(root, `packages/ts-${p}/src/f_${f}.ts`, `export const v = ${f};\n`);
    }
  }
  for (let i = 0; i < 500; i++) writeFile(root, `py/s_${i}.py`, `def f(): return ${i}\n`);
  for (let i = 0; i < 500; i++) writeFile(root, `go/h_${i}.go`, `package main\nfunc f() int { return ${i} }\n`);
}

describe.each([
  ['small', seedSmall],
  ['medium', seedMedium],
  ['large', seedLarge],
])('fixture=%s', (kind, seed) => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), `slaminar-bench-${kind}-`));
    seed(root);
  });

  afterAll(() => {
    try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  bench(`scan`, () => {
    scan(root);
  });

  bench(`analyze (scan + 5 analyzers)`, () => {
    analyze(root);
  });

  bench(`recommend (no catalog fetch, bundled)`, async () => {
    const { profile } = analyze(root);
    await recommend(profile, { projectRoot: root, tokenTier: 'smart' });
  });
});
