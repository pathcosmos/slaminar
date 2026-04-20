#!/usr/bin/env node
/**
 * CLI wall-time benchmarker (v0.9.4 / Phase Q5).
 *
 * Runs `node dist/cli.js init --dry-run <fixture>` × 3 tiers × 3 fixture
 * sizes = 9 combinations, each N times, and emits mean / stddev / min / max
 * as Markdown + JSON.
 *
 * No external deps — uses `node:child_process` + `performance.now()`.
 * This is the hyperfine-equivalent for environments that don't have
 * hyperfine installed.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), '..');
const CLI_PATH = join(REPO_ROOT, 'dist', 'cli.js');

const WARMUP = 2;
const RUNS = 8;
const FIXTURES = ['small', 'medium', 'large'];
const TIERS = ['conservative', 'smart', 'rich'];

function writeFile(root, rel, content) {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function createSmall(root) {
  writeFile(
    root,
    'package.json',
    JSON.stringify({ name: 'b-small', version: '0.1.0', type: 'module' }, null, 2),
  );
  writeFile(root, 'README.md', '# bench-small\n');
  writeFile(root, 'src/index.ts', 'export {};\n');
  for (let i = 0; i < 18; i++) writeFile(root, `src/m_${i}.ts`, `export const v = ${i};\n`);
}

function createMedium(root) {
  writeFile(
    root,
    'pyproject.toml',
    `[project]\nname = "b-medium"\nversion = "0.1.0"\nrequires-python = ">=3.10"\n`,
  );
  writeFile(root, 'README.md', '# bench-medium\n');
  for (const pkg of ['api', 'worker', 'shared']) {
    for (let i = 0; i < 150; i++) {
      writeFile(root, `packages/${pkg}/src/${pkg}/m_${i}.py`, `def h_${i}(): return ${i}\n`);
    }
    writeFile(root, `packages/${pkg}/pyproject.toml`, `[project]\nname = "${pkg}"\nversion = "0.1.0"\n`);
  }
}

function createLarge(root) {
  writeFile(
    root,
    'package.json',
    JSON.stringify({ name: 'b-large', version: '0.1.0', workspaces: ['packages/*'] }, null, 2),
  );
  writeFile(root, 'README.md', '# bench-large\n');
  for (let p = 0; p < 20; p++) {
    for (let f = 0; f < 100; f++) {
      writeFile(root, `packages/ts-${p}/src/f_${f}.ts`, `export const v_${f} = ${p * 100 + f};\n`);
    }
    writeFile(root, `packages/ts-${p}/package.json`, JSON.stringify({ name: `ts-${p}`, version: '0.1.0' }));
  }
  for (let i = 0; i < 500; i++) writeFile(root, `services/py/s_${i}.py`, `def f_${i}(): return ${i}\n`);
  for (let i = 0; i < 500; i++) writeFile(root, `services/go/h_${i}.go`, `package main\n\nfunc f${i}() int { return ${i} }\n`);
}

function createFixture(kind, root) {
  mkdirSync(root, { recursive: true });
  if (kind === 'small') createSmall(root);
  else if (kind === 'medium') createMedium(root);
  else createLarge(root);
}

function initGit(cwd) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  spawnSync('git', ['init', '--quiet'], { cwd, env });
  spawnSync('git', ['config', 'user.email', 'bench@slaminar.test'], { cwd, env });
  spawnSync('git', ['config', 'user.name', 'bench'], { cwd, env });
  spawnSync('git', ['add', '-A'], { cwd, env });
  spawnSync('git', ['commit', '--quiet', '-m', 'init'], { cwd, env });
}

function runOnce(args, cwd) {
  const env = {
    ...process.env,
    SLAMINAR_AI_PROVIDER: 'local',
    SLAMINAR_VERSION_CHECK: 'false',
    HOME: cwd,
  };
  const t0 = performance.now();
  const r = spawnSync('node', [CLI_PATH, ...args], { cwd, env, encoding: 'utf-8' });
  const t1 = performance.now();
  if (r.status !== 0) {
    throw new Error(
      `CLI exited non-zero for args ${args.join(' ')}: status=${r.status}\nstderr: ${r.stderr}`,
    );
  }
  return t1 - t0;
}

function summarize(samples) {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  return { n, mean, stddev, min, max };
}

function fmt(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

async function main() {
  const workspace = mkdtempSync(join(tmpdir(), 'slaminar-bench-'));
  const results = [];

  for (const fixture of FIXTURES) {
    const fixtureDir = join(workspace, fixture);
    console.error(`\n[bench] seeding ${fixture}…`);
    createFixture(fixture, fixtureDir);
    initGit(fixtureDir);

    for (const tier of TIERS) {
      const scenario = `init --dry-run --no-ai --token-tier ${tier} (${fixture})`;
      console.error(`[bench]   ${scenario}`);

      const args = ['init', '--dry-run', '--no-ai', '--token-tier', tier, fixtureDir];

      // Warm-up: not counted, just exercises filesystem cache.
      for (let i = 0; i < WARMUP; i++) runOnce(args, fixtureDir);

      const samples = [];
      for (let i = 0; i < RUNS; i++) {
        samples.push(runOnce(args, fixtureDir));
      }
      const s = summarize(samples);
      results.push({ fixture, tier, scenario, ...s });
      console.error(
        `[bench]     mean=${fmt(s.mean)} ±${fmt(s.stddev)} min=${fmt(s.min)} max=${fmt(s.max)} (n=${s.n})`,
      );
    }
  }

  // Cleanup
  try { rmSync(workspace, { recursive: true, force: true }); } catch {}

  // Emit Markdown + JSON
  const mdLines = [];
  mdLines.push(`## CLI wall-time (v${getVersion()}) — generated ${new Date().toISOString()}`);
  mdLines.push('');
  mdLines.push('| Fixture | Tier | mean | stddev | min | max | n |');
  mdLines.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    mdLines.push(
      `| ${r.fixture} | ${r.tier} | ${fmt(r.mean)} | ±${fmt(r.stddev)} | ${fmt(r.min)} | ${fmt(r.max)} | ${r.n} |`,
    );
  }

  const outDir = join(REPO_ROOT, 'docs', 'benchmarks', 'raw');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, `cli-wall-time-${new Date().toISOString().slice(0, 10)}.json`);
  const mdPath = join(outDir, `cli-wall-time-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(jsonPath, JSON.stringify({ warmup: WARMUP, runs: RUNS, results }, null, 2));
  writeFileSync(mdPath, mdLines.join('\n') + '\n');

  console.error(`\n[bench] JSON → ${jsonPath}`);
  console.error(`[bench] MD   → ${mdPath}`);
  console.log(mdLines.join('\n'));
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
  console.error(`[bench] error: ${err.message}`);
  process.exit(1);
});
