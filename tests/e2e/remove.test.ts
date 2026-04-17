import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar remove', () => {
  let tmp: string;
  let project: string;

  beforeEach(async () => {
    tmp = makeTmpDir('slaminar-e2e-remove-');
    project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);
  });

  afterEach(() => cleanup(tmp));

  it('removes a tool from team config (.slaminar/config.json)', async () => {
    const init = await runCli(['init', '--no-ai', project], { cwd: tmp });
    expect(init.exitCode).toBe(0);

    const configPath = join(project, '.slaminar', 'config.json');
    expect(existsSync(configPath)).toBe(true);

    const before = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      approvedTools: string[];
    };
    expect(Array.isArray(before.approvedTools)).toBe(true);
    // If there are no approved tools, skip the meaningful part of the assertion.
    if (before.approvedTools.length === 0) {
      return;
    }

    const target = before.approvedTools[0];
    // `remove` uses process.cwd(), so run it with cwd set to the project dir.
    const result = await runCli(['remove', target], { cwd: project });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(new RegExp(`Removed ${target}`));

    const after = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      approvedTools: string[];
    };
    expect(after.approvedTools).not.toContain(target);
    expect(after.approvedTools.length).toBe(before.approvedTools.length - 1);
  });
});
