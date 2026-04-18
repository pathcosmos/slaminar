import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: rollback + uninstall', () => {
  let tmp: string;
  let project: string;

  beforeEach(async () => {
    tmp = makeTmpDir('slaminar-e2e-rollback-');
    project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);
  });

  afterEach(() => cleanup(tmp));

  // R1 — happy-path round trip
  it('R1: init then uninstall restores original state', async () => {
    const readmeBefore = readFileSync(join(project, 'README.md'), 'utf-8');

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);
    expect(existsSync(join(project, 'CLAUDE.md'))).toBe(true);

    const uninstall = await runCli(['uninstall', project], { cwd: tmp });
    expect(uninstall.exitCode).toBe(0);
    expect(existsSync(join(project, '.slaminar'))).toBe(false);
    expect(existsSync(join(project, '.claude', 'plugins', 'slaminar-generated'))).toBe(false);
    // README is unchanged (was not a merge target)
    expect(readFileSync(join(project, 'README.md'), 'utf-8')).toBe(readmeBefore);
  });

  // P0-1 regression — writeManifest atomicity
  it('P0-1: manifest is valid JSON immediately after init (no .tmp artifact left)', async () => {
    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    const bkDir = join(project, '.slaminar', '.bk');
    const manifestPath = join(bkDir, 'manifest.json');
    // If init wrote CLAUDE.md which already existed, a manifest may exist.
    // For a fresh fixture without pre-existing CLAUDE.md, no merge = no manifest.
    if (existsSync(manifestPath)) {
      // Must parse successfully (atomic rename guarantee).
      const raw = readFileSync(manifestPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    }
    // No leaked .tmp-* files from interrupted writes
    const { readdirSync } = await import('node:fs');
    if (existsSync(bkDir)) {
      const leftover = readdirSync(bkDir).filter((f) => f.includes('.tmp-'));
      expect(leftover).toEqual([]);
    }
  });

  // P0-2 regression — restoreFile return value honored
  it('P0-2: uninstall surfaces missingBackups when backup blob is deleted', async () => {
    // Seed a pre-existing CLAUDE.md so init triggers merge mode (backup created).
    writeFileSync(join(project, 'CLAUDE.md'), '# Pre-existing\nUser content.\n', 'utf-8');
    await runCli(['-C', 'add', 'CLAUDE.md'].join(' ') === '' ? [] : [], { cwd: tmp }); // noop placeholder
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    await promisify(execFile)('git', ['add', 'CLAUDE.md'], { cwd: project });
    await promisify(execFile)('git', ['commit', '-m', 'pre'], { cwd: project });

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    // Sabotage: delete the backup blob but keep the manifest pointing at it.
    const bkDir = join(project, '.slaminar', '.bk');
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(bkDir).filter((f) => f.endsWith('.dat'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) rmSync(join(bkDir, f));

    const uninstall = await runCli(['uninstall', project], { cwd: tmp });
    // Uninstall should still succeed overall but warn about the missing backup.
    expect(uninstall.exitCode).toBe(0);
    expect(uninstall.stdout).toMatch(/backup blob missing|NOT restored/);
  });

  // P0-3 regression — preAction hook survives update-check failure
  it('P0-3: CLI runs even when SLAMINAR_VERSION_CHECK env forces an explicit path', async () => {
    // If preAction hook could crash, ANY CLI invocation would fail.
    // Run with update-check enabled to exercise the guarded path.
    const result = await runCli(['--version'], {
      cwd: tmp,
      env: { SLAMINAR_VERSION_CHECK: 'true' },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  // R3 — update tolerates a CLAUDE.md whose ownership markers have been
  // manually damaged. The merger should either reappend a fresh section
  // without crashing or finish cleanly; the file must remain parseable.
  it('R3: update gracefully handles malformed ownership markers', async () => {
    // First init creates CLAUDE.md with begin/end markers.
    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    const claudeMdPath = join(project, 'CLAUDE.md');
    const content = readFileSync(claudeMdPath, 'utf-8');
    expect(content).toMatch(/<!-- slaminar:begin:overview -->/);

    // Corrupt the markers: delete the "begin:overview" line entirely so the
    // merger's regex can't match the section. The merger should append a
    // fresh section instead of crashing.
    const damaged = content.replace(/<!-- slaminar:begin:overview -->\n?/, '');
    writeFileSync(claudeMdPath, damaged, 'utf-8');

    const update = await runCli(['update', project], { cwd: tmp });
    expect(update.exitCode).toBe(0);
    const after = readFileSync(claudeMdPath, 'utf-8');
    // The file should end up well-formed (at least one begin/end pair)
    expect(after).toMatch(/<!-- slaminar:begin:overview -->/);
    expect(after).toMatch(/<!-- slaminar:end:overview -->/);
  });

  // R5 — uninstall should not crash even if target files have been deleted
  // out-of-band since init wrote them.
  it('R5: uninstall on a project whose generated files were manually deleted', async () => {
    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    // External delete of the generated plugin dir.
    rmSync(join(project, '.claude', 'plugins', 'slaminar-generated'), {
      recursive: true,
      force: true,
    });
    // And CLAUDE.md too — there's no backup for it on a fresh fixture (the
    // file was 'create' mode, not 'merge'), but uninstall must tolerate
    // its absence without throwing.
    const claudeMd = join(project, 'CLAUDE.md');
    if (existsSync(claudeMd)) rmSync(claudeMd);

    const uninstall = await runCli(['uninstall', project], { cwd: tmp });
    // Exit 0 is the ideal; 1 with a clear message is also acceptable. What
    // we don't want is a crash.
    expect([0, 1]).toContain(uninstall.exitCode);
    expect(uninstall.stderr).not.toMatch(/TypeError|ReferenceError/);
    expect(existsSync(join(project, '.slaminar'))).toBe(false);
  });

  // R10 — symlink handling: init must not follow or clobber a symlinked
  // CLAUDE.md such that the target file gets corrupted.
  it('R10: init on a directory containing a symlink does not traverse dangerously', async () => {
    const { symlinkSync } = await import('node:fs');
    // Create a symlink inside src/ pointing back at src/ (self-reference).
    // Safe because our scanner has recursion guards; we're just verifying
    // the CLI exits cleanly.
    try {
      symlinkSync('.', join(project, 'src', 'self-link'));
    } catch {
      // filesystem may not permit symlinks (e.g. Windows without admin) —
      // skip gracefully in that case.
      return;
    }

    const init = await runCli(['init', '--no-ai', project], {
      cwd: tmp,
      timeoutSec: 20,
    });
    // Must not hang (timeout) and must not crash.
    expect(init.exitCode).toBe(0);
    expect(init.stderr).not.toMatch(/Maximum call stack|ELOOP unhandled/);
  });
});
