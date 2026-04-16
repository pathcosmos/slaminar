import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveCatalog } from '../../src/recommender/catalog-resolver.js';
import { saveCache } from '../../src/recommender/catalog-cache.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CatalogCacheEntry } from '../../src/types/index.js';

describe('catalog-resolver', () => {
  let tmpDir: string;
  let origXdg: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'slaminar-cr-'));
    origXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;
  });
  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = origXdg;
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('falls back to bundled catalog when no cache and remote fails', async () => {
    const resolved = await resolveCatalog({ silent: true });
    expect(resolved.source).toBe('bundled');
    expect(resolved.version).toBe('0.0.0');
    expect(resolved.tools.length).toBeGreaterThan(0);
    expect(resolved.stale).toBe(false);
  });

  it('returns cached catalog when cache is valid', async () => {
    const entry: CatalogCacheEntry = {
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://example.com/catalog.json',
      catalog: {
        version: '2.0.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [{ name: 'test-tool', repo: 'test/repo', category: 'plugin', description: 'test', authRequired: false, networkRequired: 'none', installMethod: 'marketplace', installCommands: [], prerequisites: [], tags: ['test'], maturityFit: ['growing'] }],
        suggestions: [],
        relations: [],
      },
    };
    saveCache(entry);
    const resolved = await resolveCatalog({ silent: true });
    expect(resolved.source).toBe('cache');
    expect(resolved.version).toBe('2.0.0');
    expect(resolved.tools).toHaveLength(1);
    expect(resolved.tools[0].name).toBe('test-tool');
    expect(resolved.stale).toBe(false);
  });

  it('returns stale cache when cache is expired and remote fails', async () => {
    const entry: CatalogCacheEntry = {
      fetchedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      sourceUrl: 'https://example.com/catalog.json',
      catalog: {
        version: '1.5.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [{ name: 'stale-tool', repo: 'test/repo', category: 'skill', description: 'stale', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: ['stale'], maturityFit: ['mature'] }],
        suggestions: [],
        relations: [],
      },
    };
    saveCache(entry);
    const resolved = await resolveCatalog({ silent: true });
    expect(resolved.source).toBe('cache');
    expect(resolved.version).toBe('1.5.0');
    expect(resolved.stale).toBe(true);
    expect(resolved.tools[0].name).toBe('stale-tool');
  });
});
