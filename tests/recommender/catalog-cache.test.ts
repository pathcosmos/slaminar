import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadCache, saveCache, isCacheValid, backupCache, rollbackCache, getCachePath } from '../../src/recommender/catalog-cache.js';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CatalogCacheEntry } from '../../src/types/index.js';

describe('catalog-cache', () => {
  let tmpDir: string;
  let origXdg: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'slaminar-cc-'));
    origXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;
  });
  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = origXdg;
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  });

  const mockEntry: CatalogCacheEntry = {
    fetchedAt: new Date().toISOString(),
    sourceUrl: 'https://example.com/catalog.json',
    catalog: { version: '1.0.0', minSlaminarVersion: '0.1.0', updatedAt: '', tools: [], suggestions: [], relations: [] },
  };

  it('returns null when no cache exists', () => { expect(loadCache()).toBeNull(); });
  it('saves and loads cache roundtrip', () => { saveCache(mockEntry); const loaded = loadCache(); expect(loaded?.catalog.version).toBe('1.0.0'); });
  it('isCacheValid returns true within TTL', () => { expect(isCacheValid(mockEntry)).toBe(true); });
  it('isCacheValid returns false after TTL', () => {
    const old = { ...mockEntry, fetchedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() };
    expect(isCacheValid(old)).toBe(false);
  });
  it('backup and rollback work', () => {
    saveCache(mockEntry);
    backupCache();
    saveCache({ ...mockEntry, catalog: { ...mockEntry.catalog, version: '2.0.0' } });
    expect(loadCache()?.catalog.version).toBe('2.0.0');
    expect(rollbackCache()).toBe(true);
    expect(loadCache()?.catalog.version).toBe('1.0.0');
  });
  it('rollback returns false when no backup', () => { expect(rollbackCache()).toBe(false); });
  it('handles corrupt cache file', () => {
    const { writeFileSync, mkdirSync } = require('node:fs');
    const path = getCachePath();
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'not json', 'utf-8');
    expect(loadCache()).toBeNull();
  });
});
