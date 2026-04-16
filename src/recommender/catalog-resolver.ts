import { loadCache, saveCache, isCacheValid } from './catalog-cache.js';
import { fetchRemoteCatalog, DEFAULT_CATALOG_URL } from './catalog-remote.js';
import { getCatalog } from './catalog.js';
import type { ResolvedCatalog, CatalogCacheEntry } from '../types/index.js';

export async function resolveCatalog(options?: { forceRefresh?: boolean; silent?: boolean }): Promise<ResolvedCatalog> {
  const forceRefresh = options?.forceRefresh ?? false;
  const silent = options?.silent ?? false;

  // 1. Check cache
  const cached = loadCache();
  if (cached && isCacheValid(cached) && !forceRefresh) {
    return {
      tools: cached.catalog.tools,
      relations: cached.catalog.relations ?? [],
      suggestions: cached.catalog.suggestions ?? [],
      source: 'cache',
      version: cached.catalog.version,
      stale: false,
    };
  }

  // 2. Try remote fetch
  try {
    const result = await fetchRemoteCatalog(DEFAULT_CATALOG_URL, cached?.etag);
    if (result.notModified && cached) {
      // Update fetchedAt to reset TTL
      const updated: CatalogCacheEntry = { ...cached, fetchedAt: new Date().toISOString() };
      saveCache(updated);
      return {
        tools: cached.catalog.tools,
        relations: cached.catalog.relations ?? [],
        suggestions: cached.catalog.suggestions ?? [],
        source: 'cache',
        version: cached.catalog.version,
        stale: false,
      };
    }
    // Save new cache
    const entry: CatalogCacheEntry = {
      fetchedAt: new Date().toISOString(),
      sourceUrl: DEFAULT_CATALOG_URL,
      etag: result.etag,
      catalog: result.catalog,
    };
    saveCache(entry);
    return {
      tools: result.catalog.tools,
      relations: result.catalog.relations ?? [],
      suggestions: result.catalog.suggestions ?? [],
      source: 'remote',
      version: result.catalog.version,
      stale: false,
    };
  } catch {
    // Remote failed
  }

  // 3. Stale cache fallback
  if (cached) {
    if (!silent) console.warn('⚠ Using stale catalog cache (remote fetch failed)');
    return {
      tools: cached.catalog.tools,
      relations: cached.catalog.relations ?? [],
      suggestions: cached.catalog.suggestions ?? [],
      source: 'cache',
      version: cached.catalog.version,
      stale: true,
    };
  }

  // 4. Bundled fallback
  if (!silent) console.warn('⚠ Using bundled catalog (no cache, remote failed)');
  return {
    tools: getCatalog(),
    relations: [],
    suggestions: [],
    source: 'bundled',
    version: '0.0.0',
    stale: false,
  };
}
