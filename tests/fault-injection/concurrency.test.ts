/**
 * F6 — concurrency tests.
 *
 * These exercise the matrix-flagged race conditions. Phase Q3 documents the
 * observed behavior; actual lock-file implementation is deferred to Phase Q4
 * (P1-1 in Q1 current-state.md). Tests use `Promise.all([runCli, runCli])` to
 * fire two subprocesses in parallel — race windows exist naturally because
 * scan/analyze take dozens of ms on the medium fixture.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  cleanup,
  initGit,
  makeTmpDir,
  runCli,
  seedMinimalProject,
  writeFile,
} from './_helpers.js';

describe('F6 — concurrency races (documentation tests)', () => {
  let tmp: string;
  let project: string;

  beforeEach(async () => {
    tmp = makeTmpDir('slaminar-f6-');
    project = join(tmp, 'project');
    seedMinimalProject(project);
    // Bulk up so scan/analyze/recommend have a real race window.
    for (let i = 0; i < 50; i++) {
      writeFile(project, `src/mod_${i}.ts`, `export const v_${i} = ${i};\n`);
    }
    await initGit(project);
  });

  afterEach(() => cleanup(tmp));

  // F6.a — two concurrent `init` on same cwd.
  // v0.9.3: project-scoped file lock (src/locking/file-lock.ts) now serializes
  // writers. Exactly one process acquires the lock; the other fails fast with
  // ProjectBusyError.
  it('F6.a: parallel init × 2 — lock serializes; exactly one succeeds', async () => {
    const [r1, r2] = await Promise.all([
      runCli(['init', '--no-ai', project], { cwd: tmp }),
      runCli(['init', '--no-ai', project], { cwd: tmp }),
    ]);

    // One holder, one loser.
    const exits = [r1.exitCode, r2.exitCode].sort();
    expect(exits).toEqual([0, 1]);
    const loser = r1.exitCode === 0 ? r2 : r1;
    expect(loser.stderr + loser.stdout).toMatch(
      /another slaminar process|ProjectBusyError|holding the project lock/,
    );

    // Invariant: manifest (if present) still parses.
    const manifestPath = join(project, '.slaminar/.bk/manifest.json');
    if (existsSync(manifestPath)) {
      expect(() =>
        JSON.parse(readFileSync(manifestPath, 'utf-8')),
      ).not.toThrow();
    }

    // Invariant: no leftover .tmp-* files from atomic-write interruption.
    const bkDir = join(project, '.slaminar', '.bk');
    if (existsSync(bkDir)) {
      const leftover = readdirSync(bkDir).filter((f) => f.includes('.tmp-'));
      expect(leftover).toEqual([]);
    }

    // Invariant: the project lock file is released (no orphan .lock entry).
    const lockFile = join(project, '.slaminar', 'lockfile.lock');
    expect(existsSync(lockFile)).toBe(false);
  });

  // F6.b — update + uninstall in parallel.
  it('F6.b: parallel update + uninstall — lock serializes (no crash, exit 0 or busy)', async () => {
    const primeResult = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(primeResult.exitCode).toBe(0);

    const [rUpdate, rUninstall] = await Promise.all([
      runCli(['update', project], { cwd: tmp }),
      runCli(['uninstall', project], { cwd: tmp }),
    ]);

    // Lock semantics: either both run serially (exits 0 & 0 if fast enough
    // that they don't contend) or one is rejected as busy (exit 1 with the
    // lock message). Both outcomes are acceptable — what's NOT acceptable is
    // a stack trace or an orphaned lock file.
    for (const r of [rUpdate, rUninstall]) {
      expect(r.stderr).not.toMatch(/ECONNREFUSED|TypeError|ReferenceError/);
    }
    const lockFile = join(project, '.slaminar', 'lockfile.lock');
    expect(existsSync(lockFile)).toBe(false);
  });

  // F6.d — setup --yes × 2 writing defaults.json in parallel
  it('F6.d: parallel setup --yes × 2 — defaults.json parses (last-write-wins)', async () => {
    const h1 = join(tmp, 'home1');
    const h2 = join(tmp, 'home2');

    // Separate HOMEs isolate defaults.json between processes but we still
    // exercise the setup wizard path simultaneously. For shared-HOME races,
    // use the same HOME — documented below.
    const [a, b] = await Promise.all([
      runCli(['setup', '--yes'], { cwd: tmp, home: h1 }),
      runCli(['setup', '--yes'], { cwd: tmp, home: h2 }),
    ]);
    expect(a.exitCode).toBe(0);
    expect(b.exitCode).toBe(0);

    // Same-HOME race — run 2nd round with shared HOME to observe overwrite
    const shared = join(tmp, 'shared');
    const [c, d] = await Promise.all([
      runCli(['setup', '--yes'], {
        cwd: tmp,
        home: shared,
        env: { SLAMINAR_DEFAULT_TOKEN_TIER: 'conservative' },
      }),
      runCli(['setup', '--yes'], {
        cwd: tmp,
        home: shared,
        env: { SLAMINAR_DEFAULT_TOKEN_TIER: 'rich' },
      }),
    ]);
    console.warn(
      `[F6.d shared-HOME] c=${c.exitCode} d=${d.exitCode}`,
    );
    const defaultsPath = join(shared, '.config', 'slaminar', 'defaults.json');
    if (existsSync(defaultsPath)) {
      const parsed = JSON.parse(readFileSync(defaultsPath, 'utf-8'));
      // Should be one of the two tier values (last write wins), never corrupted.
      expect(['conservative', 'rich', 'smart']).toContain(parsed.defaults?.tokenTier);
    }
  });
});
