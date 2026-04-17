import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar check', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-check-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('exits 0 after a clean init', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    const result = await runCli(['check', project], { cwd: tmp });
    // After a fresh init, expect a clean pass — exit 0. Allow 1 for warn-only.
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toMatch(/pass/i);
  });

  it('exits with a non-zero code on a non-inited dir', async () => {
    const empty = join(tmp, 'empty');
    mkdirSync(empty, { recursive: true });

    const result = await runCli(['check', empty], { cwd: tmp });
    // CLAUDE.md missing → failCount > 0 → exit 2 per ci/check.ts.
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toMatch(/fail/);
  });

  it('supports --json mode', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    const result = await runCli(['check', '--json', project], { cwd: tmp });
    expect([0, 1]).toContain(result.exitCode);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('exitCode');
    expect(parsed).toHaveProperty('verification');
    expect(parsed).toHaveProperty('summary');
  });
});
