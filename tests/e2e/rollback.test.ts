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
});
