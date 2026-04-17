import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  backupCache,
  backupSourceCache,
  getCachePath,
  getSourceCachePath,
  isCacheValid,
  loadCache,
  loadSourceCache,
  rollbackCache,
  rollbackSourceCache,
  saveCache,
  saveSourceCache,
} from '../../src/recommender/catalog-cache.js';
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

  // ─── v0.8 per-source cache ───────────────────────────────────

  it('getSourceCachePath uses per-source sub-directory for non-official ids', () => {
    const officialPath = getSourceCachePath('official');
    const companyPath = getSourceCachePath('company');
    expect(officialPath).toBe(getCachePath());
    expect(companyPath).toMatch(/cache\/company\.json$/);
    expect(companyPath).not.toBe(officialPath);
  });

  it('sanitizes unsafe chars in source ids when building paths', () => {
    const p = getSourceCachePath('foo/bar baz');
    expect(p).toMatch(/cache\/foo_bar_baz\.json$/);
  });

  it('saves / loads per-source caches independently', () => {
    const alpha = { ...mockEntry, catalog: { ...mockEntry.catalog, version: 'alpha' } };
    const beta = { ...mockEntry, catalog: { ...mockEntry.catalog, version: 'beta' } };
    saveSourceCache('alpha', alpha);
    saveSourceCache('beta', beta);
    expect(loadSourceCache('alpha')?.catalog.version).toBe('alpha');
    expect(loadSourceCache('beta')?.catalog.version).toBe('beta');
    // Legacy single cache is a distinct slot.
    expect(loadCache()).toBeNull();
  });

  it('id="official" writes to the legacy catalog-cache.json path', () => {
    saveSourceCache('official', mockEntry);
    expect(existsSync(getCachePath())).toBe(true);
    expect(loadCache()?.catalog.version).toBe('1.0.0');
  });

  it('backupSourceCache / rollbackSourceCache operate on the matching id', () => {
    saveSourceCache('team', mockEntry);
    backupSourceCache('team');
    saveSourceCache('team', { ...mockEntry, catalog: { ...mockEntry.catalog, version: '2.0.0' } });
    expect(loadSourceCache('team')?.catalog.version).toBe('2.0.0');
    expect(rollbackSourceCache('team')).toBe(true);
    expect(loadSourceCache('team')?.catalog.version).toBe('1.0.0');
  });

  it('rollbackSourceCache returns false when there is no prev file', () => {
    expect(rollbackSourceCache('never-cached')).toBe(false);
  });

  it('backupSourceCache is a no-op when the source cache is absent', () => {
    // Should not throw.
    expect(() => backupSourceCache('missing')).not.toThrow();
  });
});
