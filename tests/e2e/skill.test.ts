import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar skill (install/uninstall/status)', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-skill-');
  });

  afterEach(() => cleanup(tmp));

  const skillPathOf = (home: string) =>
    join(home, '.claude', 'skills', 'slaminar', 'SKILL.md');

  it('skill status on fresh HOME reports "not installed"', async () => {
    const result = await runCli(['skill', 'status'], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Claude Code Skill Status/);
    expect(result.stdout).toMatch(/Installed:\s*no/);
  });

  it('skill install writes SKILL.md into ~/.claude/skills/slaminar/', async () => {
    const result = await runCli(['skill', 'install'], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    expect(existsSync(skillPathOf(tmp))).toBe(true);
    expect(result.stdout).toMatch(/Skill installed|Skill updated|up to date/);
  });

  it('skill install is idempotent — second run reports unchanged', async () => {
    const first = await runCli(['skill', 'install'], { cwd: tmp });
    expect(first.exitCode).toBe(0);

    const second = await runCli(['skill', 'install'], { cwd: tmp });
    expect(second.exitCode).toBe(0);
    // Either "already up to date" (unchanged) or still succeeds; installer
    // hashes content so identical bundled content → unchanged.
    expect(second.stdout).toMatch(/already up to date|unchanged|up to date/i);
  });

  it('skill uninstall removes the installed SKILL.md', async () => {
    const install = await runCli(['skill', 'install'], { cwd: tmp });
    expect(install.exitCode).toBe(0);
    expect(existsSync(skillPathOf(tmp))).toBe(true);

    const uninstall = await runCli(['skill', 'uninstall'], { cwd: tmp });
    expect(uninstall.exitCode).toBe(0);
    expect(existsSync(skillPathOf(tmp))).toBe(false);
  });

  it('skill uninstall when nothing installed is success (exit 0)', async () => {
    const result = await runCli(['skill', 'uninstall'], { cwd: tmp });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Not installed|nothing to remove/i);
  });

  // P0-5 regression: uninstall must exit 1 when filesystem rejects removal.
  // We simulate an IO failure by replacing the target *file* with a non-empty
  // *directory*. `rmSync(path, { force: true })` (no `recursive`) then throws
  // EISDIR (POSIX) → installer catches and returns status='failed' → exit 1.
  it('P0-5: skill uninstall returns exit 1 on filesystem failure', async () => {
    const skillDir = join(tmp, '.claude', 'skills', 'slaminar');
    // Create SKILL.md as a *directory* with contents, so rmSync (non-recursive)
    // cannot remove it even with `force: true`.
    const target = join(skillDir, 'SKILL.md');
    mkdirSync(target, { recursive: true });
    mkdirSync(join(target, 'inner'), { recursive: true });

    const result = await runCli(['skill', 'uninstall'], { cwd: tmp });

    // existsSync(target) is true (it's a directory) so installer enters the
    // try block. rmSync on a non-empty directory without `recursive` throws,
    // which is caught and returned as status='failed' → CLI exit 1.
    expect(result.exitCode).toBe(1);
    expect(result.stderr + result.stdout).toMatch(/Uninstall failed|✗/);

    // Cleanup handled by afterEach's rmSync(tmp, { recursive: true }).
    // Defensive: if the test's own cleanup trips, unwind manually.
    try { rmSync(skillDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });
});
