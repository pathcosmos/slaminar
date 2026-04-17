import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar recommend', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-recommend-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('emits a RecommendationPlan JSON with a `recommended` array on small fixture', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const result = await runCli(['recommend', project], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan).toHaveProperty('recommended');
    expect(Array.isArray(plan.recommended)).toBe(true);
    expect(plan).toHaveProperty('excluded');
    expect(plan).toHaveProperty('conflicts');
  });

  it('rich tier recommends at least as many tools as conservative', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const conservative = await runCli(
      ['recommend', '--token-tier', 'conservative', project],
      { cwd: tmp },
    );
    const rich = await runCli(['recommend', '--token-tier', 'rich', project], { cwd: tmp });

    expect(conservative.exitCode).toBe(0);
    expect(rich.exitCode).toBe(0);

    const cPlan = JSON.parse(conservative.stdout);
    const rPlan = JSON.parse(rich.stdout);
    expect(rPlan.recommended.length).toBeGreaterThanOrEqual(cPlan.recommended.length);
  });

  it('rejects invalid --token-tier', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);
    await initGit(project);

    const result = await runCli(
      ['recommend', '--token-tier', 'bogus', project],
      { cwd: tmp },
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/token-tier|conservative|smart|rich/);
  });
});
