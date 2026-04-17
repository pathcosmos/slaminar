import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_DISCOVERY_TTL_MS,
  getDiscoveryCachePath,
  isDiscoveryCacheValid,
  loadDiscoveryCache,
  saveDiscoveryCache,
} from '../../src/discover/cache.js';
import type { DiscoveryResult } from '../../src/types/index.js';

function sampleResult(overrides: Partial<DiscoveryResult> = {}): DiscoveryResult {
  return {
    roots: ['/tmp/fake'],
    projects: [],
    totalCandidatesChecked: 0,
    excludedDirs: 0,
    scannedAt: new Date().toISOString(),
    elapsedMs: 1,
    ...overrides,
  };
}

describe('discover/cache', () => {
  let fakeHome: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-discovery-cache-'));
    savedEnv = { HOME: process.env.HOME, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns null when there is no cache file', () => {
    expect(loadDiscoveryCache()).toBeNull();
  });

  it('round-trips save and load', () => {
    const res = sampleResult({ projects: [] });
    const path = saveDiscoveryCache(res);
    expect(existsSync(path)).toBe(true);
    expect(path).toBe(getDiscoveryCachePath());

    const loaded = loadDiscoveryCache();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(1);
    expect(loaded!.result.roots).toEqual(['/tmp/fake']);
  });

  it('returns null for corrupted JSON', () => {
    mkdirSync(dirname(getDiscoveryCachePath()), { recursive: true });
    writeFileSync(getDiscoveryCachePath(), '{{{ bad', 'utf-8');
    expect(loadDiscoveryCache()).toBeNull();
  });

  it('returns null for unknown version field', () => {
    mkdirSync(dirname(getDiscoveryCachePath()), { recursive: true });
    writeFileSync(
      getDiscoveryCachePath(),
      JSON.stringify({ version: 999, result: sampleResult(), fetchedAt: new Date().toISOString() }),
      'utf-8',
    );
    expect(loadDiscoveryCache()).toBeNull();
  });

  it('isDiscoveryCacheValid honors the TTL', () => {
    const fresh = {
      version: 1 as const,
      result: sampleResult(),
      fetchedAt: new Date().toISOString(),
    };
    const stale = {
      ...fresh,
      fetchedAt: new Date(Date.now() - DEFAULT_DISCOVERY_TTL_MS * 2).toISOString(),
    };
    expect(isDiscoveryCacheValid(fresh)).toBe(true);
    expect(isDiscoveryCacheValid(stale)).toBe(false);
  });

  it('isDiscoveryCacheValid returns false for a malformed timestamp', () => {
    const bad = { version: 1 as const, result: sampleResult(), fetchedAt: 'not-a-date' };
    expect(isDiscoveryCacheValid(bad)).toBe(false);
  });
});
