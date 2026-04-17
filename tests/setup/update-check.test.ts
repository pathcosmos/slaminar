import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkForUpdate, formatUpdateNotice } from '../../src/setup/update-check.js';
import { builtInDefaults, saveDefaults, loadDefaults } from '../../src/setup/defaults.js';

describe('setup/update-check', () => {
  let fakeHome: string;
  let savedEnv: Record<string, string | undefined>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-upd-test-'));
    savedEnv = {
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null when versionCheck is disabled via defaults', async () => {
    saveDefaults({ ...builtInDefaults(), telemetry: { optedIn: false, versionCheck: false } });
    globalThis.fetch = vi.fn() as typeof globalThis.fetch;
    const info = await checkForUpdate('0.1.0');
    expect(info).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns null when disabledViaFlag is true', async () => {
    saveDefaults(builtInDefaults());
    globalThis.fetch = vi.fn() as typeof globalThis.fetch;
    const info = await checkForUpdate('0.1.0', { disabledViaFlag: true });
    expect(info).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('reports available update when registry returns a higher version', async () => {
    saveDefaults(builtInDefaults());
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: '0.7.1' }),
    } as Response)) as typeof globalThis.fetch;

    const info = await checkForUpdate('0.6.0', { force: true });
    expect(info).not.toBeNull();
    expect(info!.current).toBe('0.6.0');
    expect(info!.latest).toBe('0.7.1');
    expect(info!.message).toMatch(/slaminar 0\.7\.1 is available/);
  });

  it('returns null when current equals or exceeds latest', async () => {
    saveDefaults(builtInDefaults());
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: '0.6.0' }),
    } as Response)) as typeof globalThis.fetch;

    expect(await checkForUpdate('0.6.0', { force: true })).toBeNull();
    expect(await checkForUpdate('0.7.0', { force: true })).toBeNull();
  });

  it('skips versions present in skipVersions', async () => {
    const d = builtInDefaults();
    d.updateCheck.skipVersions = ['0.9.0'];
    saveDefaults(d);
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: '0.9.0' }),
    } as Response)) as typeof globalThis.fetch;

    expect(await checkForUpdate('0.6.0', { force: true })).toBeNull();
  });

  it('returns null on network failure without throwing', async () => {
    saveDefaults(builtInDefaults());
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof globalThis.fetch;

    const info = await checkForUpdate('0.6.0', { force: true });
    expect(info).toBeNull();
  });

  it('persists lastCheckedAt after a check', async () => {
    saveDefaults(builtInDefaults());
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: '0.7.0' }),
    } as Response)) as typeof globalThis.fetch;

    await checkForUpdate('0.6.0', { force: true });
    const after = loadDefaults();
    expect(after.updateCheck.lastCheckedAt).not.toBeNull();
    expect(after.updateCheck.latestKnownVersion).toBe('0.7.0');
  });

  it('uses cached result within the 7-day window', async () => {
    const d = builtInDefaults();
    d.updateCheck.lastCheckedAt = new Date().toISOString();
    d.updateCheck.latestKnownVersion = '0.8.0';
    saveDefaults(d);
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    const info = await checkForUpdate('0.6.0');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(info!.latest).toBe('0.8.0');
  });

  it('formatUpdateNotice produces a one-line yellow message', () => {
    const line = formatUpdateNotice({ current: '0.6.0', latest: '0.7.0', message: 'foo' });
    expect(line).toMatch(/foo/);
    expect(line.split('\n').length).toBe(1);
  });
});
