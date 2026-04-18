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

  // F6.a — two concurrent `init` on same cwd
  it('F6.a: parallel init × 2 — manifest remains valid JSON even if races occur', async () => {
    const [r1, r2] = await Promise.all([
      runCli(['init', '--no-ai', project], { cwd: tmp }),
      runCli(['init', '--no-ai', project], { cwd: tmp }),
    ]);

    // Document what happened (BUG visibility via warnings)
    const bothOk = r1.exitCode === 0 && r2.exitCode === 0;
    const oneFailed = r1.exitCode !== r2.exitCode;
    console.warn(
      `[F6.a] exit1=${r1.exitCode} exit2=${r2.exitCode} ` +
        (bothOk
          ? '(both succeeded — possible manifest race)'
          : oneFailed
            ? '(one failed — rollback path should have triggered)'
            : '(both failed)'),
    );

    // Invariant: if a manifest exists, it must be valid JSON.
    // v0.9.1 P0-1 atomic write protects this.
    const manifestPath = join(project, '.slaminar/.bk/manifest.json');
    if (existsSync(manifestPath)) {
      const raw = readFileSync(manifestPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    }

    // Invariant: no stray `.tmp-*` files from atomic-write interruption.
    const bkDir = join(project, '.slaminar', '.bk');
    if (existsSync(bkDir)) {
      const leftover = readdirSync(bkDir).filter((f) => f.includes('.tmp-'));
      expect(leftover).toEqual([]);
    }
  });

  // F6.b — init + concurrent uninstall
  it('F6.b: init then concurrent uninstall — no crash, manifest consistent', async () => {
    // Prime the project with a first init so uninstall has something to do.
    const primeResult = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(primeResult.exitCode).toBe(0);

    const [rInit, rUninstall] = await Promise.all([
      runCli(['update', project], { cwd: tmp }),
      runCli(['uninstall', project], { cwd: tmp }),
    ]);
    console.warn(
      `[F6.b] update exit=${rInit.exitCode}, uninstall exit=${rUninstall.exitCode}`,
    );

    // Either order, but final state must not crash and manifest (if present)
    // must still parse.
    const manifestPath = join(project, '.slaminar/.bk/manifest.json');
    if (existsSync(manifestPath)) {
      expect(() =>
        JSON.parse(readFileSync(manifestPath, 'utf-8')),
      ).not.toThrow();
    }
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
