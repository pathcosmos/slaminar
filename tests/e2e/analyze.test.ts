import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar analyze', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-analyze-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('analyzes a small (TypeScript) fixture and detects the language', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);

    const result = await runCli(['analyze', project], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    const profile = JSON.parse(result.stdout);
    expect(profile.language.primary.toLowerCase()).toMatch(/typescript|javascript/);
    // Small fixture has package.json with typescript/vitest — profile should mention them somewhere.
    expect(JSON.stringify(profile)).toMatch(/typescript|vitest/i);
  });

  it('detects Python as the primary language on the medium fixture', async () => {
    const project = join(tmp, 'project');
    createFixture('medium', project);

    const result = await runCli(['analyze', project], { cwd: tmp, timeoutSec: 60 });

    expect(result.exitCode).toBe(0);
    const profile = JSON.parse(result.stdout);
    expect(profile.language.primary.toLowerCase()).toContain('python');
  });

  it('produces a profile for an empty directory without crashing', async () => {
    const empty = join(tmp, 'empty');
    mkdirSync(empty, { recursive: true });

    const result = await runCli(['analyze', empty], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    const profile = JSON.parse(result.stdout);
    // Empty dir has no recognized project type — expect a graceful fallback.
    expect(profile).toHaveProperty('language');
    expect(profile.language.primary.toLowerCase()).toMatch(/unknown|none|other|javascript|typescript/);
  });
});
