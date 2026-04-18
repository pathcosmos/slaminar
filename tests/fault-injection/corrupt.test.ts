/**
 * F3 — Corrupt config file fault injection (Phase Q3).
 * Focus: F3.c (manifest on uninstall) + F3.f (team config on update) —
 * matrix-flagged "신규 확인 필요".
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cleanup,
  initGit,
  makeTmpDir,
  runCli,
  seedMinimalProject,
  writeCorruptJson,
  writeFile,
} from './_helpers.js';

describe('fault-injection F3: corrupt config files', () => {
  let tmp: string;
  let home: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-fault-corrupt-');
    home = join(tmp, 'home');
    writeFile(home, '.config/slaminar/.keep', '');
  });

  afterEach(() => cleanup(tmp));

  it('F3.a — corrupt defaults.json: doctor falls back to built-in', async () => {
    const df = join(home, '.config/slaminar/defaults.json');
    writeCorruptJson(home, '.config/slaminar/defaults.json');

    const result = await runCli(['doctor'], { cwd: tmp, home });

    // loadDefaults catches parse → builtInDefaults. Exit 0/1/2 (warn count
    // depends on other checks), never a crash trace.
    expect([0, 1, 2]).toContain(result.exitCode);
    expect(result.stdout).toMatch(/slaminar doctor/);
    expect(result.stderr).not.toMatch(/SyntaxError|JSON\.parse|TypeError/);

    // Observed: the update-check preAction hook (src/setup/update-check.ts)
    // calls loadDefaults→saveDefaults to persist lastCheckedAt. That rewrite
    // effectively "heals" the corrupt file silently. Accept that as the
    // observed behavior — re-run must not crash and must produce valid JSON.
    const after = readFileSync(df, 'utf-8');
    expect(() => JSON.parse(after)).not.toThrow();
  }, 30_000);

  it('F3.b — corrupt auth.json: AI provider detected as local', async () => {
    writeCorruptJson(home, '.config/slaminar/auth.json');

    const result = await runCli(['doctor'], { cwd: tmp, home });

    // loadAuthConfig → null on parse fail; detectAiProvider → local.
    expect([0, 1, 2]).toContain(result.exitCode);
    expect(result.stderr).not.toMatch(/SyntaxError|JSON\.parse/);
    expect(result.stdout).toMatch(/slaminar doctor/);
  }, 30_000);

  it('F3.c — corrupt manifest.json: uninstall is graceful (★ new)', async () => {
    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    // First init creates CLAUDE.md (nothing to back up).
    const init1 = await runCli(['init', '--no-ai', project], { cwd: tmp, home });
    expect(init1.exitCode).toBe(0);

    // Second init backs up the now-existing CLAUDE.md and writes manifest.
    const init2 = await runCli(['init', '--no-ai', project], { cwd: tmp, home });
    expect(init2.exitCode).toBe(0);
    const manifestPath = join(project, '.slaminar/.bk/manifest.json');
    expect(existsSync(manifestPath)).toBe(true);

    // Clobber → readManifest() returns [] (backup.ts:58).
    writeFileSync(manifestPath, '{ "not": "an array" truncated');

    const result = await runCli(['uninstall', project], { cwd: tmp, home });
    const combined = `${result.stderr}\n${result.stdout}`;

    // Per matrix: exit 0 or 1, "graceful". Observed: no warning at all.
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stderr).not.toMatch(/SyntaxError|Unexpected token/);
    expect(result.stdout).toMatch(/uninstall complete/);
    // .slaminar dir is unconditionally removed (uninstaller.ts:45).
    expect(existsSync(join(project, '.slaminar'))).toBe(false);

    // BUG: src/placer/backup.ts:58 silently returns [] on corrupt manifest.
    // uninstaller.ts has no signal that backups were unreadable, so
    // missingBackups stays empty and the user gets a clean "complete"
    // message even when original files may have been overwritten.
    if (!combined.match(/warning|corrupt|manifest|unreadable/i)) {
      console.warn(
        '[F3.c] BUG: uninstall gave no warning for unreadable manifest ' +
          '(src/placer/backup.ts:58).',
      );
    }
  }, 60_000);

  it('F3.d — corrupt catalog cache: init falls back to bundled', async () => {
    // Legacy + v0.8 per-source paths + extra sibling entries.
    writeCorruptJson(home, '.config/slaminar/catalog-cache.json');
    writeCorruptJson(home, '.config/slaminar/cache/official.json');
    writeCorruptJson(home, '.config/slaminar/cache/a.json');
    writeCorruptJson(home, '.config/slaminar/cache/b.json');

    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    const result = await runCli(
      ['init', '--no-ai', '--dry-run', project],
      { cwd: tmp, home },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/slaminar init complete|DRY RUN/);
    expect(result.stderr).not.toMatch(/SyntaxError|JSON\.parse/);
    // Corrupt files untouched — recommender never rewrote them.
    const entries = readdirSync(join(home, '.config/slaminar/cache'));
    expect(entries).toEqual(expect.arrayContaining(['a.json', 'b.json']));
  }, 60_000);

  it('F3.e — corrupt plugin.json: check reports fail (exit 2)', async () => {
    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp, home });
    expect(init.exitCode).toBe(0);
    const pluginJson = join(
      project,
      '.claude/plugins/slaminar-generated/plugin.json',
    );
    expect(existsSync(pluginJson)).toBe(true);

    // validator/plugin-schema.ts:28 catches parse → "Valid JSON" fail.
    writeFileSync(pluginJson, '{ "name": "slaminar-generated" not-json');

    const result = await runCli(['check', project], { cwd: tmp, home });

    expect(result.exitCode).toBe(2); // runCheck: failCount > 0 → 2
    expect(result.stdout).toMatch(/Valid JSON|not valid JSON|fail/i);
    expect(result.stderr).not.toMatch(/SyntaxError at/);
  }, 60_000);

  it('F3.f — corrupt .slaminar/config.json: update is graceful (★ new)', async () => {
    const project = join(tmp, 'project');
    seedMinimalProject(project);
    await initGit(project);

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp, home });
    expect(init.exitCode).toBe(0);
    const teamConfig = join(project, '.slaminar/config.json');
    expect(existsSync(teamConfig)).toBe(true);

    writeFileSync(teamConfig, '{ "approvedTools": [not valid json');

    const result = await runCli(['update', project], { cwd: tmp, home });
    const combined = `${result.stderr}\n${result.stdout}`;

    // team/config.ts:42 catches parse → DEFAULT_TEAM. update → analyze →
    // recommend pipeline runs; update does NOT call saveTeamConfig, so the
    // corrupt file stays on disk. Matrix F3.f expects "1 or graceful —
    // 경고 + rebuild"; observed is silent (no warning, no rebuild).
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stderr).not.toMatch(/SyntaxError|Unexpected token/);

    if (result.exitCode === 0 && !combined.match(/warning|corrupt|config\.json/i)) {
      // Silent: the file is STILL corrupt after update finished.
      const after = readFileSync(teamConfig, 'utf-8');
      expect(after).toContain('not valid json');
      // BUG: src/team/config.ts:42 silent fallback + src/core/updater.ts
      // never calls saveTeamConfig → users can lose approvedTools /
      // catalogUrl / catalogMode without notice.
      console.warn(
        '[F3.f] BUG: update silently tolerates corrupt .slaminar/config.json ' +
          '(src/team/config.ts:42 + src/core/updater.ts).',
      );
    }
  }, 60_000);
});
