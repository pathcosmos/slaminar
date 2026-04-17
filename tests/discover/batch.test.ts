import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { batchApply } from '../../src/discover/batch.js';
import type { DiscoveredProject } from '../../src/types/index.js';

function makeDirWithPackage(base: string, name: string, lang: 'ts' | 'py' = 'ts'): string {
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  if (lang === 'ts') {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, scripts: { build: 'tsc' } }));
    writeFileSync(join(dir, 'tsconfig.json'), '{}');
  } else {
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "x"\n');
  }
  return dir;
}

function discoveredNew(root: string, lang: string = 'typescript'): DiscoveredProject {
  return {
    root,
    status: 'new',
    signatures: ['claude-dir'],
    language: lang,
    hasClaudeMd: false,
    claudeMdLines: null,
    slaminarVersion: null,
    suggestedAction: 'init',
  };
}

function discoveredSkip(root: string, reason: string): DiscoveredProject {
  return {
    root,
    status: 'unsupported',
    signatures: [],
    language: null,
    hasClaudeMd: false,
    claudeMdLines: null,
    slaminarVersion: null,
    suggestedAction: 'skip',
    skipReason: reason,
  };
}

describe('discover/batch', () => {
  let base: string;
  let fakeHome: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'slaminar-batch-test-'));
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-batch-home-'));
    savedEnv = { HOME: process.env.HOME, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
    rmSync(fakeHome, { recursive: true, force: true });
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns empty result for an empty project list', async () => {
    const out = await batchApply([]);
    expect(out.attempted).toBe(0);
    expect(out.succeeded).toEqual([]);
    expect(out.failed).toEqual([]);
    expect(out.skipped).toEqual([]);
    expect(out.summaryPath).not.toBeNull();
  });

  it('moves skip-suggested projects into skipped without attempting', async () => {
    const out = await batchApply([discoveredSkip('/fake', 'language not detected')]);
    expect(out.attempted).toBe(0);
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0]!.reason).toBe('language not detected');
  });

  it('runs init in dry-run without writing CLAUDE.md', async () => {
    const dir = makeDirWithPackage(base, 'proj');
    const out = await batchApply([discoveredNew(dir)], { dryRun: true });
    expect(out.attempted).toBe(1);
    expect(out.succeeded).toHaveLength(1);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
  });

  it('runs init for real when dryRun=false', async () => {
    const dir = makeDirWithPackage(base, 'proj2');
    const out = await batchApply([discoveredNew(dir)], { dryRun: false });
    expect(out.succeeded).toHaveLength(1);
    expect(out.succeeded[0]!.action).toBe('init');
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
  });

  it('onlyNew skips non-new projects', async () => {
    const dir = makeDirWithPackage(base, 'existing-proj');
    writeFileSync(join(dir, 'CLAUDE.md'), '# x\n');
    const existing: DiscoveredProject = {
      ...discoveredNew(dir),
      status: 'existing',
      suggestedAction: 'init-merge',
      hasClaudeMd: true,
      claudeMdLines: 2,
    };
    const out = await batchApply([existing], { onlyNew: true, dryRun: true });
    expect(out.attempted).toBe(0);
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0]!.reason).toMatch(/--only-new/);
  });

  it('captures init failures in the failed list', async () => {
    const out = await batchApply([discoveredNew('/this/directory/does/not/exist')], {
      dryRun: true,
    });
    expect(out.attempted).toBe(1);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.root).toBe('/this/directory/does/not/exist');
  });

  it('writes a markdown summary under ~/.config/slaminar/setup-logs/', async () => {
    const dir = makeDirWithPackage(base, 'logged-proj');
    const out = await batchApply([discoveredNew(dir)], { dryRun: true });
    expect(out.summaryPath).not.toBeNull();
    expect(existsSync(out.summaryPath!)).toBe(true);
    expect(out.summaryPath!).toMatch(/setup-logs/);
  });
});
