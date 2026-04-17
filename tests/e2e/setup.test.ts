import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar setup (--yes)', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-setup-');
  });

  afterEach(() => cleanup(tmp));

  const defaultsPathOf = (home: string) =>
    join(home, '.config', 'slaminar', 'defaults.json');

  it('setup --yes creates defaults.json at ~/.config/slaminar/', async () => {
    const result = await runCli(['setup', '--yes', '--no-discovery'], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Setup complete/);

    const dp = defaultsPathOf(tmp);
    expect(existsSync(dp)).toBe(true);

    const parsed = JSON.parse(readFileSync(dp, 'utf-8'));
    expect(parsed.version).toBe(1);
    expect(parsed.defaults).toBeTruthy();
    expect(parsed.catalog).toBeTruthy();
  });

  it('setup --yes honors SLAMINAR_DEFAULT_TOKEN_TIER=conservative', async () => {
    const result = await runCli(['setup', '--yes', '--no-discovery'], {
      cwd: tmp,
      env: { SLAMINAR_DEFAULT_TOKEN_TIER: 'conservative' },
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(readFileSync(defaultsPathOf(tmp), 'utf-8'));
    expect(parsed.defaults.tokenTier).toBe('conservative');
  });

  it('setup --yes with invalid SLAMINAR_DEFAULT_TOKEN_TIER falls back to smart (no crash)', async () => {
    const result = await runCli(['setup', '--yes', '--no-discovery'], {
      cwd: tmp,
      env: { SLAMINAR_DEFAULT_TOKEN_TIER: 'bogus' },
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(readFileSync(defaultsPathOf(tmp), 'utf-8'));
    // Wizard rejects bogus values and keeps the existing/default tier.
    expect(parsed.defaults.tokenTier).toBe('smart');
  });

  it('setup --yes --reconfigure defaults updates only the defaults section', async () => {
    // Seed a pre-existing defaults.json with a non-default catalog URL we
    // expect --reconfigure=defaults to leave alone.
    const dp = defaultsPathOf(tmp);
    mkdirSync(join(tmp, '.config', 'slaminar'), { recursive: true });
    const seeded = {
      version: 1,
      savedAt: new Date(0).toISOString(),
      defaults: {
        aiMode: 'auto',
        excludeAuthTools: true,
        fileCountCap: 10000,
        verbose: false,
        tokenTier: 'smart',
      },
      catalog: {
        autoRefreshHours: 24,
        url: 'https://example.com/sentinel.json',
        mode: 'extend',
      },
      discovery: { lastRoots: [], excludePatterns: [], maxDepth: 4 },
      skill: { autoInstall: true, scope: 'global' },
      telemetry: { optedIn: false, versionCheck: true },
      updateCheck: { lastCheckedAt: null, latestKnownVersion: null, skipVersions: [] },
    };
    writeFileSync(dp, JSON.stringify(seeded, null, 2), 'utf-8');

    const result = await runCli(
      ['setup', '--yes', '--reconfigure', 'defaults'],
      { cwd: tmp, env: { SLAMINAR_DEFAULT_TOKEN_TIER: 'rich' } },
    );

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(readFileSync(dp, 'utf-8'));
    // Defaults section updated.
    expect(parsed.defaults.tokenTier).toBe('rich');
    // Catalog sentinel preserved — proves we only touched `defaults`.
    expect(parsed.catalog.url).toBe('https://example.com/sentinel.json');
    expect(parsed.catalog.mode).toBe('extend');
  });
});
