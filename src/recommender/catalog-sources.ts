/**
 * Multi-source catalog federation (v0.8) — helpers for building the list of
 * catalog sources that `catalog-resolver` will iterate through.
 *
 * Priority layering (ascending = lower wins collisions, higher wins):
 *   -1  bundled         always present, ultimate fallback
 *    0  official remote DEFAULT_CATALOG_URL (implicit unless a replace-source
 *                       of priority >= 0 is present)
 *  100  user sources    ~/.config/slaminar/defaults.json → catalog.sources[]
 *  200  team sources    <project>/.slaminar/config.json → catalogSources[]
 *  500  env sources     SLAMINAR_CATALOG_SOURCES
 *  999  CLI adhoc       `--catalog <url> [--catalog-mode <mode>]`
 *
 * Legacy v0.3–v0.7 fields (`catalogUrl`/`catalogMode`) are migrated into a
 * synthetic source at the appropriate layer on load. No file is rewritten
 * automatically — the next explicit save replaces them naturally.
 */

import type {
  CatalogMode,
  CatalogSource,
  CatalogSourceScope,
  CatalogSourceType,
} from '../types/index.js';
import { DEFAULT_CATALOG_URL } from './catalog-remote.js';
import { loadTeamConfig, saveTeamConfig } from '../team/config.js';
import { loadDefaults, saveDefaults } from '../setup/defaults.js';

export const BUNDLED_SOURCE_ID = 'bundled';
export const OFFICIAL_SOURCE_ID = 'official';

export const SCOPE_PRIORITY: Record<CatalogSourceScope, number> = {
  bundled: -1,
  official: 0,
  user: 100,
  project: 200,
  env: 500,
  cli: 999,
};

export function inferSourceType(uri: string): CatalogSourceType {
  if (uri === '<bundled>') return 'official';
  if (uri === DEFAULT_CATALOG_URL) return 'official';
  if (uri.startsWith('github:')) return 'github';
  if (uri.startsWith('http://') || uri.startsWith('https://')) return 'url';
  if (uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('~')) return 'file';
  return 'file';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^github:/, 'gh-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function hashShort(s: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).slice(0, 6);
}

/**
 * Deterministic, stable ID for a source when the user didn't provide one.
 * Combines a slug with a short hash so two sources sharing a slug (e.g.,
 * different paths ending in `catalog.json`) still collide-free.
 */
export function generateSourceId(uri: string, scope: CatalogSourceScope): string {
  const slug = slugify(uri) || 'src';
  return `${scope}-${slug}-${hashShort(uri)}`;
}

export function bundledSource(): CatalogSource {
  return {
    id: BUNDLED_SOURCE_ID,
    type: 'official',
    uri: '<bundled>',
    priority: SCOPE_PRIORITY.bundled,
    mode: 'extend',
    enabled: true,
    trust: 'trusted',
    addedAt: '1970-01-01T00:00:00.000Z',
    scope: 'bundled',
  };
}

export function officialSource(): CatalogSource {
  return {
    id: OFFICIAL_SOURCE_ID,
    type: 'official',
    uri: DEFAULT_CATALOG_URL,
    priority: SCOPE_PRIORITY.official,
    mode: 'extend',
    enabled: true,
    trust: 'trusted',
    addedAt: '1970-01-01T00:00:00.000Z',
    scope: 'official',
  };
}

export interface MigrateLegacyInput {
  url: string;
  mode: CatalogMode;
  scope: CatalogSourceScope;
  addedAt?: string;
}

/**
 * Synthesize a `CatalogSource` from a legacy single-URL config value.
 * Returns `null` when the URL is empty — callers treat absence as "no layer".
 */
export function migrateSingleUrlToSource(input: MigrateLegacyInput): CatalogSource | null {
  const { url, mode, scope } = input;
  if (!url) return null;
  const type = inferSourceType(url);
  return {
    id: `${scope}-legacy`,
    type,
    uri: url,
    priority: SCOPE_PRIORITY[scope],
    mode,
    enabled: true,
    trust: 'trusted',
    addedAt: input.addedAt ?? '1970-01-01T00:00:00.000Z',
    scope,
  };
}

/**
 * Parse the `SLAMINAR_CATALOG_SOURCES` env var. Format:
 *
 *   <mode>:<uri>[,<mode>:<uri>...]
 *
 * where `mode` is `extend` or `replace` and `uri` can contain anything except
 * a literal comma. An empty / undefined input yields no sources.
 */
export function parseEnvSources(envVar: string | undefined): CatalogSource[] {
  if (!envVar) return [];
  const entries = envVar
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: CatalogSource[] = [];
  for (const entry of entries) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx < 0) continue;
    const modeRaw = entry.slice(0, colonIdx).trim();
    const uri = entry.slice(colonIdx + 1).trim();
    if (!uri) continue;
    if (modeRaw !== 'extend' && modeRaw !== 'replace') continue;
    out.push({
      id: generateSourceId(uri, 'env'),
      type: inferSourceType(uri),
      uri,
      priority: SCOPE_PRIORITY.env,
      mode: modeRaw,
      enabled: true,
      trust: 'untrusted',
      addedAt: new Date().toISOString(),
      scope: 'env',
    });
  }
  return out;
}

/**
 * Build an ad-hoc CLI source for the `--catalog <url>` flag. Returns `null`
 * when the url is empty so callers can chain safely.
 */
export function makeCliAdhocSource(
  url: string | undefined | null,
  mode: CatalogMode | undefined,
): CatalogSource | null {
  if (!url) return null;
  return {
    id: 'cli-adhoc',
    type: inferSourceType(url),
    uri: url,
    priority: SCOPE_PRIORITY.cli,
    mode: mode ?? 'replace',
    enabled: true,
    trust: 'untrusted',
    addedAt: new Date().toISOString(),
    scope: 'cli',
  };
}

export interface LoadEffectiveSourcesOptions {
  projectRoot?: string;
  cliSource?: CatalogSource | null;
  envVar?: string;
}

/**
 * Build the ordered (priority-ascending) list of sources that the resolver
 * will iterate over. Disabled sources are **kept** in the returned array so
 * the UI can surface them; resolver skips them when fetching.
 *
 * Order:
 *   bundled (-1)
 *   official (0)                           ← dropped if any user/team/env/CLI source
 *                                            at priority >= 0 has mode='replace'
 *   user defaults sources (100+)
 *   team project sources (200+)
 *   env sources (500)
 *   CLI adhoc (999)
 */
export function loadEffectiveSources(options: LoadEffectiveSourcesOptions = {}): CatalogSource[] {
  const layers: CatalogSource[] = [bundledSource()];

  // User sources — prefer new array, fall back to legacy single-URL migration.
  try {
    const defaults = loadDefaults();
    const userArr = defaults.catalog.sources ?? [];
    if (userArr.length > 0) {
      for (const src of userArr) layers.push(normalizeSource(src, 'user'));
    } else {
      const migrated = migrateSingleUrlToSource({
        url: defaults.catalog.url,
        mode: defaults.catalog.mode,
        scope: 'user',
      });
      if (migrated) layers.push(migrated);
    }
  } catch {
    // Defaults unreadable — treat as no user sources.
  }

  // Team sources.
  if (options.projectRoot) {
    try {
      const team = loadTeamConfig(options.projectRoot);
      const teamArr = team.catalogSources ?? [];
      if (teamArr.length > 0) {
        for (const src of teamArr) layers.push(normalizeSource(src, 'project'));
      } else {
        const migrated = migrateSingleUrlToSource({
          url: team.catalogUrl,
          mode: team.catalogMode,
          scope: 'project',
        });
        if (migrated) layers.push(migrated);
      }
    } catch {
      // Team config unreadable — skip.
    }
  }

  // Env sources.
  const envSources = parseEnvSources(options.envVar ?? process.env.SLAMINAR_CATALOG_SOURCES);
  for (const src of envSources) layers.push(src);

  // CLI adhoc source.
  if (options.cliSource) layers.push(options.cliSource);

  // Insert the official remote source unless a replace-mode source above it
  // would shadow everything anyway.
  const replaceAboveOfficial = layers.some(
    (s) => s.priority >= SCOPE_PRIORITY.official && s.mode === 'replace' && s.enabled,
  );
  if (!replaceAboveOfficial) {
    layers.push(officialSource());
  }

  layers.sort((a, b) => a.priority - b.priority);
  return layers;
}

/**
 * Ensure a source object read from disk has every required field. Older
 * files may lack `trust` / `scope` / `enabled` — fill with safe defaults.
 */
function normalizeSource(src: CatalogSource, scope: CatalogSourceScope): CatalogSource {
  return {
    ...src,
    scope: src.scope ?? scope,
    enabled: src.enabled ?? true,
    trust: src.trust ?? 'trusted',
    mode: src.mode ?? 'extend',
    priority: typeof src.priority === 'number' ? src.priority : SCOPE_PRIORITY[scope],
    type: src.type ?? inferSourceType(src.uri),
    addedAt: src.addedAt ?? '1970-01-01T00:00:00.000Z',
  };
}

// ─── Source persistence (v0.8 CLI surface) ────────────────────

export type PersistentSourceScope = 'user' | 'project';

export function readUserSources(): CatalogSource[] {
  try {
    return loadDefaults().catalog.sources ?? [];
  } catch {
    return [];
  }
}

export function writeUserSources(sources: CatalogSource[]): string {
  const d = loadDefaults();
  const updated = { ...d, catalog: { ...d.catalog, sources } };
  return saveDefaults(updated);
}

export function readTeamSources(projectRoot: string): CatalogSource[] {
  try {
    return loadTeamConfig(projectRoot).catalogSources ?? [];
  } catch {
    return [];
  }
}

export function writeTeamSources(projectRoot: string, sources: CatalogSource[]): void {
  const team = loadTeamConfig(projectRoot);
  saveTeamConfig(projectRoot, { ...team, catalogSources: sources });
}

export interface AddSourceInput {
  uri: string;
  mode: CatalogMode;
  scope: PersistentSourceScope;
  id?: string;
  priority?: number;
  trust?: CatalogSource['trust'];
  projectRoot?: string; // required when scope === 'project'
}

/**
 * Persist a new source at the given scope. Duplicates (same id or same uri)
 * within the scope are replaced to keep the array idempotent under re-runs.
 */
export function addSource(input: AddSourceInput): CatalogSource {
  const id = input.id && input.id.length > 0 ? input.id : generateSourceId(input.uri, input.scope);
  const priority = input.priority ?? SCOPE_PRIORITY[input.scope];
  const source: CatalogSource = {
    id,
    type: inferSourceType(input.uri),
    uri: input.uri,
    priority,
    mode: input.mode,
    enabled: true,
    trust: input.trust ?? 'untrusted',
    addedAt: new Date().toISOString(),
    scope: input.scope,
  };

  if (input.scope === 'user') {
    const existing = readUserSources().filter((s) => s.id !== id && s.uri !== input.uri);
    writeUserSources([...existing, source]);
  } else {
    if (!input.projectRoot) {
      throw new Error('project scope requires a projectRoot');
    }
    const existing = readTeamSources(input.projectRoot).filter(
      (s) => s.id !== id && s.uri !== input.uri,
    );
    writeTeamSources(input.projectRoot, [...existing, source]);
  }

  return source;
}

export interface RemoveSourceInput {
  identifier: string; // id or uri
  scope: PersistentSourceScope;
  projectRoot?: string;
}

export function removeSource(input: RemoveSourceInput): boolean {
  if (input.scope === 'user') {
    const before = readUserSources();
    const after = before.filter((s) => s.id !== input.identifier && s.uri !== input.identifier);
    if (after.length === before.length) return false;
    writeUserSources(after);
    return true;
  }
  if (!input.projectRoot) throw new Error('project scope requires a projectRoot');
  const before = readTeamSources(input.projectRoot);
  const after = before.filter((s) => s.id !== input.identifier && s.uri !== input.identifier);
  if (after.length === before.length) return false;
  writeTeamSources(input.projectRoot, after);
  return true;
}

export function setSourceEnabled(
  identifier: string,
  enabled: boolean,
  scope: PersistentSourceScope,
  projectRoot?: string,
): boolean {
  const read = scope === 'user' ? readUserSources() : readTeamSources(projectRoot ?? '');
  let changed = false;
  const updated = read.map((s) => {
    if (s.id === identifier || s.uri === identifier) {
      if (s.enabled !== enabled) changed = true;
      return { ...s, enabled };
    }
    return s;
  });
  if (!changed) return false;
  if (scope === 'user') writeUserSources(updated);
  else writeTeamSources(projectRoot ?? '', updated);
  return true;
}

/**
 * Aggregate sources from every persistent scope + env + bundled/official
 * for display (`catalog source list`). Unlike `loadEffectiveSources`, this
 * does NOT include the CLI adhoc source (since `list` is not invoked with
 * a pending flag).
 */
export function listAllSources(projectRoot?: string): CatalogSource[] {
  return loadEffectiveSources({ projectRoot }).filter((s) => s.scope !== 'cli');
}
