#!/usr/bin/env node
/**
 * Library-level per-phase benchmarker (v0.9.4 / Phase Q5).
 *
 * Measures slaminar's pipeline stages (scan / analyze / recommend) in-process
 * by importing from dist/, so we can decompose wall-time into per-phase
 * contributions. This complements scripts/bench-cli.mjs which measures
 * subprocess wall-time (which is Node-startup-dominated).
 *
 * No external deps — `performance.now()` + import from dist.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), '..');

// Lazy imports — require `npm run build` first.
const scannerMod = await import(join(REPO_ROOT, 'dist', 'core', 'scanner.js'));
const pipelineMod = await import(join(REPO_ROOT, 'dist', 'core', 'pipeline.js'));
const recommenderMod = await import(join(REPO_ROOT, 'dist', 'recommender', 'recommender.js'));

const { scan } = scannerMod;
const { analyze } = pipelineMod;
const { recommend } = recommenderMod;

const WARMUP = 3;
const RUNS = 15;
const FIXTURES = ['small', 'medium', 'large'];

function writeFile(root, rel, content) {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function createFixture(kind, root) {
  mkdirSync(root, { recursive: true });
  if (kind === 'small') {
    writeFile(root, 'package.json', JSON.stringify({ name: 'b-s', version: '0.1.0', type: 'module' }));
    writeFile(root, 'README.md', '# s\n');
    for (let i = 0; i < 18; i++) writeFile(root, `src/m_${i}.ts`, `export const v = ${i};\n`);
  } else if (kind === 'medium') {
    writeFile(root, 'pyproject.toml', `[project]\nname = "b-m"\nversion = "0.1.0"\n`);
    for (const p of ['api', 'worker', 'shared']) {
      for (let i = 0; i < 150; i++) writeFile(root, `packages/${p}/src/${p}/m_${i}.py`, `def h(): return ${i}\n`);
    }
  } else {
    writeFile(root, 'package.json', JSON.stringify({ name: 'b-l', version: '0.1.0' }));
    for (let p = 0; p < 20; p++) {
      for (let f = 0; f < 100; f++) writeFile(root, `packages/ts-${p}/src/f_${f}.ts`, `export const v = ${f};\n`);
    }
    for (let i = 0; i < 500; i++) writeFile(root, `py/s_${i}.py`, `def f(): return ${i}\n`);
    for (let i = 0; i < 500; i++) writeFile(root, `go/h_${i}.go`, `package main\nfunc f() int { return ${i} }\n`);
  }
}

function summarize(samples) {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  return { n, mean, stddev, min: Math.min(...samples), max: Math.max(...samples) };
}

async function measure(label, fn, opts = {}) {
  const warmup = opts.warmup ?? WARMUP;
  const runs = opts.runs ?? RUNS;
  for (let i = 0; i < warmup; i++) await fn();
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  const s = summarize(samples);
  return { label, ...s };
}

function fmt(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

async function main() {
  const workspace = mkdtempSync(join(tmpdir(), 'slaminar-bench-lib-'));
  const results = [];

  for (const fixture of FIXTURES) {
    const fixtureDir = join(workspace, fixture);
    console.error(`\n[bench-lib] seeding ${fixture}…`);
    createFixture(fixture, fixtureDir);

    // Scan-only — measures file tree walk + git info + package read
    const scanResult = await measure(`scan(${fixture})`, () => {
      scan(fixtureDir);
    });
    results.push({ fixture, phase: 'scan', ...scanResult });

    // Analyze = scan + 5 analyzers (language/structure/convention/deps/maturity)
    const analyzeResult = await measure(`analyze(${fixture})`, () => {
      analyze(fixtureDir);
    });
    results.push({ fixture, phase: 'analyze', ...analyzeResult });

    // Recommend needs a profile — compute once per iteration to include
    // the analyze cost only if caller would have it cached. For isolation,
    // we reuse a single profile across runs.
    const { profile } = analyze(fixtureDir);
    const recommendResult = await measure(
      `recommend(${fixture})`,
      async () => {
        await recommend(profile, { projectRoot: fixtureDir, tokenTier: 'smart' });
      },
      { runs: 10 },
    );
    results.push({ fixture, phase: 'recommend', ...recommendResult });

    for (const r of results.filter((x) => x.fixture === fixture)) {
      console.error(`[bench-lib]   ${r.phase.padEnd(10)} mean=${fmt(r.mean)} ±${fmt(r.stddev)} min=${fmt(r.min)} max=${fmt(r.max)} (n=${r.n})`);
    }
  }

  try { rmSync(workspace, { recursive: true, force: true }); } catch {}

  // Emit
  const version = getVersion();
  const lines = [];
  lines.push(`## Library-level phase breakdown (v${version}) — generated ${new Date().toISOString()}`);
  lines.push('');
  lines.push('| Fixture | Phase | mean | stddev | min | max | n |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(
      `| ${r.fixture} | ${r.phase} | ${fmt(r.mean)} | ±${fmt(r.stddev)} | ${fmt(r.min)} | ${fmt(r.max)} | ${r.n} |`,
    );
  }

  const outDir = join(REPO_ROOT, 'docs', 'benchmarks', 'raw');
  mkdirSync(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  writeFileSync(join(outDir, `lib-phases-${date}.json`), JSON.stringify({ warmup: WARMUP, runs: RUNS, results }, null, 2));
  writeFileSync(join(outDir, `lib-phases-${date}.md`), lines.join('\n') + '\n');

  console.error(`\n[bench-lib] JSON → ${join(outDir, `lib-phases-${date}.json`)}`);
  console.error(`[bench-lib] MD   → ${join(outDir, `lib-phases-${date}.md`)}`);
  console.log(lines.join('\n'));
}

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

main().catch((err) => {
  console.error(`[bench-lib] error: ${err.message}\n${err.stack}`);
  process.exit(1);
});
