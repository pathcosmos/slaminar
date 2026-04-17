import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar update', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-update-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('runs successfully after init and preserves ownership markers', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);
    expect(existsSync(join(project, 'CLAUDE.md'))).toBe(true);

    const update = await runCli(['update', project], { cwd: tmp });
    expect(update.exitCode).toBe(0);
    expect(existsSync(join(project, 'CLAUDE.md'))).toBe(true);

    const claudeMd = readFileSync(join(project, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toMatch(/<!-- slaminar:begin:overview -->/);
    expect(claudeMd).toMatch(/<!-- slaminar:end:overview -->/);
  });

  it('handles update before init gracefully (no crash on an empty dir)', async () => {
    const empty = join(tmp, 'empty');
    mkdirSync(empty, { recursive: true });

    const result = await runCli(['update', empty], { cwd: tmp });

    // Update on an un-initted project may either exit 0 (treat all as new files)
    // or emit a clear "nothing to update" path — we accept either so long as it
    // doesn't throw an uncaught error.
    expect([0, 1]).toContain(result.exitCode);
    // Either success banner or error — never a naked crash trace.
    expect(result.stdout + result.stderr).not.toMatch(/UnhandledPromiseRejection|\bat async\b/);
  });
});
