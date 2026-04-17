import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, initGit, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar discover', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-discover-');
  });

  afterEach(() => cleanup(tmp));

  const cachePathOf = (home: string) =>
    join(home, '.config', 'slaminar', 'discovery-cache.json');

  it('finds multiple sub-projects under a root and writes the cache', async () => {
    // Build a discover root containing two small projects. Both have a
    // `.claude` marker so the shallow project-detector picks them up.
    const discoverRoot = join(tmp, 'workspaces');
    const projectA = join(discoverRoot, 'proj-a');
    const projectB = join(discoverRoot, 'proj-b');
    createFixture('small', projectA);
    createFixture('small', projectB);
    // Claude signature file so looksLikeProjectShallow() triggers without init.
    mkdirSync(join(projectA, '.claude'), { recursive: true });
    mkdirSync(join(projectB, '.claude'), { recursive: true });
    await initGit(projectA);
    await initGit(projectB);

    const result = await runCli(['discover', discoverRoot], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    // Discovery table abbreviates $HOME-relative paths to ~. Match on the
    // project leaf name which survives that rewrite.
    expect(result.stdout).toContain('proj-a');
    expect(result.stdout).toContain('proj-b');
    // Summary line: "N project(s): ..."
    expect(result.stdout).toMatch(/2 project\(s\)/);

    // Cache written under the isolated HOME.
    const cp = cachePathOf(tmp);
    expect(existsSync(cp)).toBe(true);
    const parsed = JSON.parse(readFileSync(cp, 'utf-8'));
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.result.projects)).toBe(true);
    expect(parsed.result.projects.length).toBeGreaterThanOrEqual(2);
  });

  it('reports 0 found when given a path that has no Claude/slaminar markers', async () => {
    const emptyRoot = join(tmp, 'empty');
    mkdirSync(emptyRoot, { recursive: true });

    const result = await runCli(['discover', emptyRoot], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    // The reporter short-circuits to a friendly "No Claude Code projects
    // found" line when the result set is empty.
    expect(result.stdout).toMatch(/No Claude Code projects found/i);
  });

  it('emits JSON with --json containing roots + projects array', async () => {
    const discoverRoot = join(tmp, 'workspaces-json');
    const projectA = join(discoverRoot, 'proj-a');
    createFixture('small', projectA);
    mkdirSync(join(projectA, '.claude'), { recursive: true });
    await initGit(projectA);

    const result = await runCli(['discover', '--json', discoverRoot], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    const start = result.stdout.indexOf('{');
    expect(start).toBeGreaterThanOrEqual(0);
    const parsed = JSON.parse(result.stdout.slice(start));
    expect(Array.isArray(parsed.roots)).toBe(true);
    expect(Array.isArray(parsed.projects)).toBe(true);
    expect(parsed.projects.length).toBeGreaterThanOrEqual(1);
  });
});
