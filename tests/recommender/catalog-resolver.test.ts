import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveCatalog } from '../../src/recommender/catalog-resolver.js';
import { saveCache, saveSourceCache } from '../../src/recommender/catalog-cache.js';
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
    const resolved = await resolveCatalog({ silent: true, catalogUrl: 'https://unreachable.invalid/catalog.json' });
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

  it('accepts custom catalogUrl option and falls back to bundled', async () => {
    const resolved = await resolveCatalog({ silent: true, catalogUrl: 'https://custom.example.com/catalog.json' });
    // Custom URL will fail (no server), should fall back to bundled
    expect(resolved.source).toBe('bundled');
    expect(resolved.tools.length).toBeGreaterThan(0);
  });

  it('returns stale cache when cache is expired and remote fails', async () => {
    const entry: CatalogCacheEntry = {
      fetchedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      sourceUrl: 'https://unreachable.invalid/catalog.json',
      catalog: {
        version: '1.5.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [{ name: 'stale-tool', repo: 'test/repo', category: 'skill', description: 'stale', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: ['stale'], maturityFit: ['mature'] }],
        suggestions: [],
        relations: [],
      },
    };
    // v0.8: a `--catalog <url>` flag becomes the `cli-adhoc` source, which
    // keeps its cache under its own ID. Writing to that slot simulates a
    // prior successful fetch before the remote went offline.
    saveSourceCache('cli-adhoc', entry);
    const resolved = await resolveCatalog({ silent: true, catalogUrl: 'https://unreachable.invalid/catalog.json' });
    expect(resolved.source).toBe('cache');
    expect(resolved.version).toBe('1.5.0');
    expect(resolved.stale).toBe(true);
    expect(resolved.tools[0].name).toBe('stale-tool');
  });

  // ─── v0.8 multi-source scenarios ─────────────────────────────

  it('merges caches from multiple sources with priority ordering', async () => {
    // official (priority 0) — a shared tool with a low-priority tag
    saveSourceCache('official', {
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://official.invalid/catalog.json',
      catalog: {
        version: '1.0.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [
          { name: 'shared', repo: 'o/shared', category: 'skill', description: 'o', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: ['low'], maturityFit: ['mature'] },
          { name: 'official-only', repo: 'o/only', category: 'skill', description: 'o', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: [], maturityFit: ['mature'] },
        ],
        suggestions: [],
        relations: [],
      },
    });

    const { addSource } = await import('../../src/recommender/catalog-sources.js');
    addSource({
      uri: 'https://user.example/c.json',
      mode: 'extend',
      scope: 'user',
      id: 'user-override',
    });

    saveSourceCache('user-override', {
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://user.example/c.json',
      catalog: {
        version: '2.0.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [
          { name: 'shared', repo: 'u/shared', category: 'skill', description: 'u', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: ['high'], maturityFit: ['mature'] },
          { name: 'user-only', repo: 'u/only', category: 'skill', description: 'u', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: [], maturityFit: ['mature'] },
        ],
        suggestions: [],
        relations: [],
      },
    });

    const resolved = await resolveCatalog({ silent: true });
    expect(resolved.source).toBe('multi');
    const sharedTool = resolved.tools.find((t) => t.name === 'shared');
    expect(sharedTool!.tags).toEqual(['high']);
    expect(resolved.tools.map((t) => t.name).sort()).toEqual(['official-only', 'shared', 'user-only']);
    expect(resolved.sourceTrace).toBeDefined();
  });

  it('replace source drops every lower-priority layer', async () => {
    saveSourceCache('official', {
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://official.invalid/catalog.json',
      catalog: {
        version: '1.0.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [{ name: 'official-tool', repo: 'o/t', category: 'skill', description: 'o', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: [], maturityFit: ['mature'] }],
        suggestions: [],
        relations: [],
      },
    });
    const { addSource } = await import('../../src/recommender/catalog-sources.js');
    addSource({
      uri: 'https://allowlist.example/c.json',
      mode: 'replace',
      scope: 'user',
      id: 'allowlist',
    });
    saveSourceCache('allowlist', {
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://allowlist.example/c.json',
      catalog: {
        version: '1.0.0',
        minSlaminarVersion: '0.1.0',
        updatedAt: '',
        tools: [{ name: 'approved', repo: 'a/t', category: 'skill', description: 'a', authRequired: false, networkRequired: 'none', installMethod: 'npx', installCommands: [], prerequisites: [], tags: [], maturityFit: ['mature'] }],
        suggestions: [],
        relations: [],
      },
    });
    const resolved = await resolveCatalog({ silent: true });
    expect(resolved.tools.map((t) => t.name)).toEqual(['approved']);
  });

  it('falls back to bundled when every non-bundled source fails', async () => {
    const { bundledSource } = await import('../../src/recommender/catalog-sources.js');
    const dead = {
      id: 'dead',
      type: 'url' as const,
      uri: 'https://unreachable.invalid/c.json',
      priority: 100,
      mode: 'extend' as const,
      enabled: true,
      trust: 'untrusted' as const,
      addedAt: '1970-01-01T00:00:00.000Z',
      scope: 'user' as const,
    };
    const resolved = await resolveCatalog({ silent: true, sources: [bundledSource(), dead] });
    expect(resolved.source).toBe('bundled');
    expect(resolved.tools.length).toBeGreaterThan(0);
  });

  it('explicit sources option bypasses loadEffectiveSources discovery', async () => {
    const { bundledSource } = await import('../../src/recommender/catalog-sources.js');
    const resolved = await resolveCatalog({ silent: true, sources: [bundledSource()] });
    expect(resolved.source).toBe('bundled');
  });
});
