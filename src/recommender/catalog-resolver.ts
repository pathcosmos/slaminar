import { loadCache, saveCache, isCacheValid } from './catalog-cache.js';
import { fetchRemoteCatalog, DEFAULT_CATALOG_URL } from './catalog-remote.js';
import { getCatalog } from './catalog.js';
import { mergeCatalogs } from './catalog-merger.js';
import { loadTeamConfig } from '../team/config.js';
import type { ResolvedCatalog, CatalogCacheEntry, CatalogMode } from '../types/index.js';

export interface ResolveCatalogOptions {
  forceRefresh?: boolean;
  silent?: boolean;
  catalogUrl?: string;
  catalogMode?: CatalogMode;
  projectRoot?: string;
}

async function resolveOfficialCatalog(options: { forceRefresh: boolean; silent: boolean }): Promise<ResolvedCatalog> {
  const { forceRefresh, silent } = options;

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

async function resolveCustomCatalog(url: string, silent: boolean): Promise<ResolvedCatalog | null> {
  try {
    const result = await fetchRemoteCatalog(url);
    return {
      tools: result.catalog.tools,
      relations: result.catalog.relations ?? [],
      suggestions: result.catalog.suggestions ?? [],
      source: 'remote',
      version: result.catalog.version,
      stale: false,
    };
  } catch {
    if (!silent) console.warn(`⚠ Custom catalog fetch failed (${url})`);
    return null;
  }
}

export async function resolveCatalog(options?: ResolveCatalogOptions): Promise<ResolvedCatalog> {
  const forceRefresh = options?.forceRefresh ?? false;
  const silent = options?.silent ?? false;

  // Determine effective URL and mode (CLI flag > config > defaults)
  let effectiveUrl = options?.catalogUrl ?? '';
  let effectiveMode: CatalogMode = options?.catalogMode ?? 'replace';

  if (options?.projectRoot && !options?.catalogUrl) {
    const config = loadTeamConfig(options.projectRoot);
    if (!effectiveUrl && config.catalogUrl) effectiveUrl = config.catalogUrl;
    if (!options?.catalogMode && config.catalogMode) effectiveMode = config.catalogMode;
  }

  // No custom URL → resolve official catalog (original behavior)
  if (!effectiveUrl) {
    return resolveOfficialCatalog({ forceRefresh, silent });
  }

  // Replace mode: use custom URL as the sole source (original --catalog behavior)
  if (effectiveMode === 'replace') {
    // Use the custom URL through the same fallback chain
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

    try {
      const result = await fetchRemoteCatalog(effectiveUrl, cached?.etag);
      if (result.notModified && cached) {
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
      const entry: CatalogCacheEntry = {
        fetchedAt: new Date().toISOString(),
        sourceUrl: effectiveUrl,
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

  // Extend mode: resolve official, then fetch custom, then merge
  const official = await resolveOfficialCatalog({ forceRefresh, silent });
  const custom = await resolveCustomCatalog(effectiveUrl, silent);

  if (!custom) {
    // Custom failed — return official alone
    return official;
  }

  return mergeCatalogs(official, custom);
}
