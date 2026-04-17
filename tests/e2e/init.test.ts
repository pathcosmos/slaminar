import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar init', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-init-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('dry-run produces a report without writing files', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const result = await runCli(['init', '--dry-run', '--no-ai', project], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('DRY RUN');
    expect(result.stdout).toContain('slaminar init complete');
    expect(existsSync(join(project, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(project, '.slaminar'))).toBe(false);
  });

  it('actual run writes CLAUDE.md and .slaminar artifacts', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const result = await runCli(['init', '--no-ai', project], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(project, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(project, '.slaminar'))).toBe(true);
    expect(existsSync(join(project, '.claude', 'plugins', 'slaminar-generated'))).toBe(true);

    // Ownership markers exist
    const claudeMd = readFileSync(join(project, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toMatch(/<!-- slaminar:begin:overview -->/);
    expect(claudeMd).toMatch(/<!-- slaminar:end:overview -->/);
  });

  it('rejects invalid --token-tier', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const result = await runCli(
      ['init', '--no-ai', '--token-tier', 'fast', project],
      { cwd: tmp },
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/token-tier|conservative|smart|rich/);
  });

  it('honors --token-tier conservative and reports tier-filter exclusions', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const result = await runCli(
      ['init', '--dry-run', '--no-ai', '--token-tier', 'conservative', project],
      { cwd: tmp },
    );

    expect(result.exitCode).toBe(0);
    // Conservative filter should exclude at least one tool on a typical fixture.
    expect(result.stdout).toMatch(/Excluded by tier filter/);
  });
});
