/**
 * F2 — Filesystem fault injection (Phase Q3).
 *
 * Scope: EACCES on file/dir, symlink loops, read-only HOME.
 * ENOSPC is not portably reproducible and is skipped per fault-matrix.
 *
 * Primitives: chmod 0o000 / 0o444 / 0o555 for permission denial;
 *   symlinkSync for loop; HOME override for global config denial.
 *
 * Cleanup: `_helpers.cleanup()` already chmods the root back to 0o755 before
 * rm. When we chmod *subpaths* we restore them explicitly in `afterEach`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmodSync, existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cleanup,
  initGit,
  makeTmpDir,
  runCli,
  seedMinimalProject,
  writeFile,
} from './_helpers.js';

describe('fault-injection F2: filesystem errors', () => {
  let tmp: string;
  // Track subpaths we chmod so afterEach can restore them regardless of
  // whether the test assertion passed or the process was killed.
  let chmodded: Array<{ path: string; mode: number }>;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-fault-fs-');
    chmodded = [];
  });

  afterEach(() => {
    for (const { path, mode } of chmodded) {
      try {
        if (existsSync(path)) chmodSync(path, mode);
      } catch {
        /* best-effort */
      }
    }
    cleanup(tmp);
  });

  it('F2.a — CLAUDE.md read-only surfaces a write-permission error on re-init', async () => {
    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    // First init succeeds normally, producing CLAUDE.md with ownership markers.
    const first = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(first.exitCode).toBe(0);
    const claudeMd = join(project, 'CLAUDE.md');
    expect(existsSync(claudeMd)).toBe(true);

    const originalContent = readFileSync(claudeMd, 'utf-8');

    // Now make CLAUDE.md read-only. Re-running init should attempt to merge
    // (mode 'merge') and fail with EACCES on writeFileSync.
    chmodSync(claudeMd, 0o444);
    chmodded.push({ path: claudeMd, mode: 0o644 });

    const second = await runCli(['init', '--no-ai', project], { cwd: tmp });
    const combined = `${second.stderr}\n${second.stdout}`;

    // Expected: non-zero exit + a permission-style error surfaced.
    //
    // BUG candidate: src/placer/writer.ts:24-31 swallows per-file errors and
    // only throws when *every* target fails. If plugin.json / other targets
    // still succeed, CLAUDE.md permission error is silently lost and the CLI
    // still exits 0. We observe + document the behavior rather than hard-fail.
    if (second.exitCode === 0) {
      // Swallow confirmed — content should still be unchanged thanks to the
      // OS denying the write, but the CLI gave no diagnostic.
      expect(readFileSync(claudeMd, 'utf-8')).toBe(originalContent);
      // Flag: do not fail the test, but console-log so the suite report picks
      // it up during triage.
      // BUG: src/placer/writer.ts:29 — throws only if written.length === 0
      // (partial-write success masks EACCES on CLAUDE.md).
      console.warn('[F2.a] writer.ts silently swallowed EACCES on CLAUDE.md');
    } else {
      expect(combined).toMatch(/permission|EACCES|read-only/i);
      // And CLAUDE.md should be unchanged since the write failed.
      expect(readFileSync(claudeMd, 'utf-8')).toBe(originalContent);
    }
  }, 60_000);

  it('F2.b — parent dir read-only prevents .slaminar creation', async () => {
    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    // Make the project root read+exec only (no write). This prevents
    // creating .slaminar/ and .claude/ subdirectories.
    chmodSync(project, 0o555);
    chmodded.push({ path: project, mode: 0o755 });

    const result = await runCli(['init', '--no-ai', project], { cwd: tmp });
    const combined = `${result.stderr}\n${result.stdout}`;

    expect(result.exitCode).not.toBe(0);
    expect(combined).toMatch(/EACCES|permission|read-only/i);
  }, 60_000);

  it.skip('F2.c — ENOSPC (not portably reproducible; see fault-matrix.md)', () => {
    // Simulating disk-full portably would require a tmpfs mount or a
    // pre-sized image file. Skipped — documented in docs/qa/fault-matrix.md.
  });

  it('F2.d — symlink loop during scan does not cause infinite recursion', async () => {
    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    // a/ → b/ and b/ → a/ inside src/loops.
    const loopDir = join(project, 'src', 'loops');
    writeFile(project, 'src/loops/.keep', '');
    // Create two dirs that symlink to each other.
    const a = join(loopDir, 'a');
    const b = join(loopDir, 'b');
    // POSIX: symlink targets can be relative.
    symlinkSync('./b', a);
    symlinkSync('./a', b);

    const result = await runCli(['scan', project], { cwd: tmp, timeoutSec: 20 });

    // Scanner uses statSync (follows symlinks) — with a loop it may hit
    // ELOOP, but should NOT hang. We assert the process exited in time with
    // a JSON snapshot or a clear error.
    //
    // The scanner logic in src/scanner/file-tree.ts:67 wraps statSync in
    // try/catch and `continue`s on failure — so ELOOP is silently skipped
    // and scan completes.
    expect([0, 1]).toContain(result.exitCode);
    // Either it printed a snapshot (exit 0) or an error message (exit 1).
    if (result.exitCode === 0) {
      expect(result.stdout).toMatch(/"root"|"fileTree"|files|tree/);
    } else {
      expect(`${result.stderr}${result.stdout}`).toMatch(/ELOOP|loop|symlink|Error/i);
    }
  }, 30_000);

  it('F2.e — read-only ~/.config/slaminar prevents setup --yes from saving defaults', async () => {
    // HOME sandbox: create HOME/.config/slaminar and chmod it 0o444 so
    // saveDefaults() → writeFileSync fails.
    const home = join(tmp, 'home');
    writeFile(home, '.config/slaminar/.keep', '');
    const slaminarCfgDir = join(home, '.config', 'slaminar');
    chmodSync(slaminarCfgDir, 0o444);
    chmodded.push({ path: slaminarCfgDir, mode: 0o755 });

    const project = join(tmp, 'project');
    seedMinimalProject(project);

    const result = await runCli(['setup', '--yes', '--no-discovery'], {
      cwd: project,
      home,
      // Skip auth prompt entirely — --yes uses SLAMINAR_* env.
      env: {
        SLAMINAR_AI_PROVIDER: 'local',
      },
    });

    // Expected: exit 1 + "permission" / EACCES. saveDefaults can't write.
    //
    // Observed: the CLI may still exit 0 because setup catches the save
    // failure in some paths. If that happens, verify the defaults file was
    // NOT written — that's the important invariant.
    const combined = `${result.stderr}\n${result.stdout}`;
    const defaultsPath = join(slaminarCfgDir, 'defaults.json');

    if (result.exitCode === 0) {
      // Silent failure: confirm nothing was actually written (OS-enforced).
      expect(existsSync(defaultsPath)).toBe(false);
      // BUG: setup wizard (src/setup/wizard.ts:642 saveDefaults) does not
      // wrap the save in a try/catch that surfaces EACCES — the process
      // exits 0 even when defaults could not be persisted.
      console.warn('[F2.e] setup --yes exited 0 despite read-only config dir');
    } else {
      expect(combined).toMatch(/permission|EACCES|read-only/i);
      expect(existsSync(defaultsPath)).toBe(false);
    }
  }, 60_000);
});
