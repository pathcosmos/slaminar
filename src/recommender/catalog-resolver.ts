/**
 * Multi-source catalog resolver (v0.8).
 *
 * Flow:
 *   1. Build the effective source list via `loadEffectiveSources()`
 *   2. Fetch each enabled source with per-source fallback
 *        cache → remote → stale → failed
 *      The bundled source skips fetching and always succeeds.
 *   3. Merge via `mergeCatalogStack()` which handles `replace` floors and
 *      N-way extend-style layering.
 *
 * Backward compatibility:
 *   - `ResolveCatalogOptions.catalogUrl` / `catalogMode` still work — they're
 *     synthesized into a CLI adhoc source at priority 999.
 *   - When the effective source set is only [bundled, official], the result
 *     shape matches v0.7 (source: 'remote' | 'cache' | 'bundled').
 */

import { isCacheValid, loadSourceCache, saveSourceCache, DEFAULT_TTL_MS } from './catalog-cache.js';
import { fetchCatalogBySource, meetsMinSlaminarVersion } from './catalog-remote.js';
import { getCatalog } from './catalog.js';
import { mergeCatalogStack, type MergeLayer } from './catalog-merger.js';
import { loadEffectiveSources, makeCliAdhocSource, BUNDLED_SOURCE_ID } from './catalog-sources.js';
import { loadDefaults } from '../setup/defaults.js';
import type {
  CatalogCacheEntry,
  CatalogFetchState,
  CatalogMode,
  CatalogSource,
  ResolvedCatalog,
} from '../types/index.js';

function resolveTtlMs(): number {
  try {
    const hours = loadDefaults().catalog.autoRefreshHours;
    if (hours < 0) return DEFAULT_TTL_MS;
    if (hours === 0) return Number.POSITIVE_INFINITY;
    return hours * 60 * 60 * 1000;
  } catch {
    return DEFAULT_TTL_MS;
  }
}

export interface ResolveCatalogOptions {
  forceRefresh?: boolean;
  silent?: boolean;
  catalogUrl?: string;
  catalogMode?: CatalogMode;
  projectRoot?: string;
  /**
   * Optionally inject an explicit source list. When provided, bypasses
   * `loadEffectiveSources()` entirely — used by tests and by the
   * `catalog source test` command.
   */
  sources?: CatalogSource[];
}

function bundledLayer(source: CatalogSource): MergeLayer {
  return {
    source,
    resolved: {
      tools: getCatalog(),
      relations: [],
      suggestions: [],
      source: 'bundled',
      version: '0.0.0',
      stale: false,
    },
    state: 'bundled',
  };
}

async function fetchSource(
  source: CatalogSource,
  options: { forceRefresh: boolean; silent: boolean },
): Promise<MergeLayer> {
  if (source.id === BUNDLED_SOURCE_ID) return bundledLayer(source);
  if (!source.enabled) {
    return { source, resolved: null, state: 'failed' };
  }

  const ttl = resolveTtlMs();
  const cached = loadSourceCache(source.id);

  if (cached && isCacheValid(cached, ttl) && !options.forceRefresh) {
    return {
      source,
      resolved: {
        tools: cached.catalog.tools,
        relations: cached.catalog.relations ?? [],
        suggestions: cached.catalog.suggestions ?? [],
        source: 'cache',
        version: cached.catalog.version,
        stale: false,
      },
      state: 'cache',
    };
  }

  try {
    const result = await fetchCatalogBySource(source, cached?.etag);
    if (result.notModified && cached) {
      const updated: CatalogCacheEntry = { ...cached, fetchedAt: new Date().toISOString() };
      try { saveSourceCache(source.id, updated); } catch { /* non-fatal */ }
      return {
        source,
        resolved: {
          tools: cached.catalog.tools,
          relations: cached.catalog.relations ?? [],
          suggestions: cached.catalog.suggestions ?? [],
          source: 'cache',
          version: cached.catalog.version,
          stale: false,
        },
        state: 'cache',
      };
    }
    // v0.9.2 P0-8 (F8.a): honor minSlaminarVersion. Catalogs that require a
    // newer slaminar than installed are skipped with a warning; we fall back
    // to cache/bundled via the control-flow below.
    if (!meetsMinSlaminarVersion(result.catalog.minSlaminarVersion)) {
      if (!options.silent) {
        console.warn(
          `⚠ Catalog source '${source.id}' requires slaminar >= ${result.catalog.minSlaminarVersion} — skipping (upgrade with \`npm install -g slaminar@latest\`)`,
        );
      }
      // fall through to cache/bundled fallback
    } else {
      const entry: CatalogCacheEntry = {
        fetchedAt: new Date().toISOString(),
        sourceUrl: source.uri,
        etag: result.etag,
        catalog: result.catalog,
      };
      try { saveSourceCache(source.id, entry); } catch { /* non-fatal */ }
      return {
        source,
        resolved: {
          tools: result.catalog.tools,
          relations: result.catalog.relations ?? [],
          suggestions: result.catalog.suggestions ?? [],
          source: 'remote',
          version: result.catalog.version,
          stale: false,
        },
        state: 'remote',
      };
    }
  } catch {
    // Remote failed — try stale cache.
  }

  if (cached) {
    if (!options.silent) console.warn(`⚠ Using stale cache for ${source.id} (remote fetch failed)`);
    return {
      source,
      resolved: {
        tools: cached.catalog.tools,
        relations: cached.catalog.relations ?? [],
        suggestions: cached.catalog.suggestions ?? [],
        source: 'cache',
        version: cached.catalog.version,
        stale: true,
      },
      state: 'stale',
    };
  }

  if (!options.silent) console.warn(`⚠ Source ${source.id} failed (no cache, remote unreachable)`);
  return { source, resolved: null, state: 'failed' };
}

export async function resolveCatalog(options?: ResolveCatalogOptions): Promise<ResolvedCatalog> {
  const forceRefresh = options?.forceRefresh ?? false;
  const silent = options?.silent ?? false;

  const cliSource =
    options?.sources !== undefined
      ? null
      : makeCliAdhocSource(options?.catalogUrl, options?.catalogMode);

  const sources =
    options?.sources !== undefined
      ? [...options.sources].sort((a, b) => a.priority - b.priority)
      : loadEffectiveSources({
          projectRoot: options?.projectRoot,
          cliSource,
        });

  const layers: MergeLayer[] = [];
  for (const src of sources) {
    layers.push(await fetchSource(src, { forceRefresh, silent }));
  }

  const merged = mergeCatalogStack(layers);

  // If the only successful layer was bundled, preserve the pre-v0.8 warning
  // to keep the human-facing UX consistent when custom sources all fail.
  const successfulStates = layers
    .filter((l) => l.state !== 'failed')
    .map((l) => l.source.id);
  const onlyBundled = successfulStates.length === 1 && successfulStates[0] === BUNDLED_SOURCE_ID;
  if (onlyBundled && !silent) {
    const anyNonBundled = layers.some(
      (l) => l.source.id !== BUNDLED_SOURCE_ID && l.source.enabled,
    );
    if (anyNonBundled) {
      console.warn('⚠ Using bundled catalog (all remote/custom sources failed)');
    }
  }

  return merged;
}
