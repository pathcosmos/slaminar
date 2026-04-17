import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar status', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-status-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('reports CLAUDE.md checks after init', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    const result = await runCli(['status', project], { cwd: tmp });

    // Exit code is 0 (all pass) / 1 (warn) / 2 (fail). Accept any of these — we just
    // need to know the command ran and produced output referencing CLAUDE.md.
    expect([0, 1, 2]).toContain(result.exitCode);
    expect(result.stdout).toMatch(/CLAUDE\.md|file-exists|has-headings/);
  });

  it('does not crash on a non-inited directory', async () => {
    const empty = join(tmp, 'empty');
    mkdirSync(empty, { recursive: true });

    const result = await runCli(['status', empty], { cwd: tmp });

    // Non-zero exit is expected (CLAUDE.md missing → fail), but the CLI must
    // not throw an uncaught error. Accept any documented code.
    expect([0, 1, 2]).toContain(result.exitCode);
    // Summary line always present: "N pass, N fail, N warn"
    expect(result.stdout).toMatch(/pass.*fail.*warn/i);
  });
});
