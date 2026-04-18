import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve as resolvePath } from 'node:path';
import type { CatalogSource, RemoteCatalog } from '../types/index.js';
import { SLAMINAR_VERSION } from '../version.js';

export const DEFAULT_CATALOG_URL =
  'https://raw.githubusercontent.com/pathcosmos/slaminar/main/catalog/catalog.json';

export interface FetchResult {
  catalog: RemoteCatalog;
  etag?: string;
  notModified: boolean;
}

/**
 * Normalize a local-catalog URI or path into an absolute filesystem path.
 * Accepts `file://` URIs, `~/...` home-relative paths, `./...` cwd-relative
 * paths, and absolute paths.
 */
function normalizeLocalPath(uri: string): string {
  let path = uri.replace(/^file:\/\//, '');
  if (path.startsWith('~/') || path === '~') {
    path = resolvePath(homedir(), path.slice(path === '~' ? 1 : 2));
  } else if (!path.startsWith('/')) {
    path = resolvePath(process.cwd(), path);
  }
  return path;
}

/**
 * Load a catalog from a local filesystem path. Returns the same `FetchResult`
 * shape as `fetchRemoteCatalog()` so downstream code (merger, cache) can stay
 * transport-agnostic. No caching is applied here — local files are cheap to
 * read and rely on filesystem timestamps, not HTTP ETags.
 */
export async function fetchLocalCatalog(uri: string): Promise<FetchResult> {
  const path = normalizeLocalPath(uri);
  const raw = readFileSync(path, 'utf-8');
  const json: unknown = JSON.parse(raw);

  if (!validateCatalogSchema(json)) {
    throw new Error(`Local catalog at ${path} does not match expected schema`);
  }

  return { catalog: json, notModified: false };
}

/**
 * Convert a `github:owner/repo/path/to/catalog.json` shorthand into the
 * `https://raw.githubusercontent.com/owner/repo/main/path/to/catalog.json`
 * URL that the remote fetcher can actually hit. Branch defaults to `main`.
 */
function githubShorthandToUrl(uri: string): string {
  const stripped = uri.replace(/^github:/, '');
  const slashIdx = stripped.indexOf('/');
  if (slashIdx < 0) throw new Error(`Invalid github: source (expected owner/repo/path): ${uri}`);
  const owner = stripped.slice(0, slashIdx);
  const rest = stripped.slice(slashIdx + 1);
  const secondSlash = rest.indexOf('/');
  if (secondSlash < 0) throw new Error(`Invalid github: source (missing path after repo): ${uri}`);
  const repo = rest.slice(0, secondSlash);
  const path = rest.slice(secondSlash + 1);
  return `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
}

/**
 * Dispatcher — route a `CatalogSource` to the correct fetcher based on
 * `source.type`. Lets the resolver stay oblivious to transport details.
 */
export async function fetchCatalogBySource(
  source: CatalogSource,
  etag?: string,
): Promise<FetchResult> {
  switch (source.type) {
    case 'file':
      return fetchLocalCatalog(source.uri);
    case 'github':
      return fetchRemoteCatalog(githubShorthandToUrl(source.uri), etag);
    case 'url':
    case 'official':
    default:
      return fetchRemoteCatalog(source.uri === '<bundled>' ? undefined : source.uri, etag);
  }
}

export function validateCatalogSchema(data: unknown): data is RemoteCatalog {
  if (data === null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.version === 'string' &&
    typeof obj.minSlaminarVersion === 'string' &&
    Array.isArray(obj.tools)
  );
}

/**
 * v0.9.2 P0-8 (F8.a): compare a catalog's `minSlaminarVersion` against the
 * installed slaminar version. Returns `true` if installed >= required.
 *
 * Pragmatic semver: splits on `.`, compares numeric segments left-to-right.
 * Pre-release suffixes are not honored (uncommon for slaminar). This is a
 * policy gate, not a full semver library — good enough to reject a catalog
 * that declares `minSlaminarVersion: "99.0.0"` while we're on 0.9.2.
 */
export function meetsMinSlaminarVersion(
  minVersion: string,
  installedVersion: string = SLAMINAR_VERSION,
): boolean {
  const parse = (s: string): number[] =>
    s
      .split('-')[0] // strip -alpha, -beta, etc.
      .split('.')
      .map((n) => Number.parseInt(n, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  const a = parse(installedVersion);
  const b = parse(minVersion);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return true;
}

export class IncompatibleCatalogVersionError extends Error {
  constructor(
    public readonly minSlaminarVersion: string,
    public readonly installedVersion: string,
    public readonly sourceUri: string,
  ) {
    super(
      `Catalog at ${sourceUri} requires slaminar >= ${minSlaminarVersion}, ` +
        `but installed version is ${installedVersion}. Upgrade with ` +
        `\`npm install -g slaminar@latest\` or use --no-catalog / a different source.`,
    );
    this.name = 'IncompatibleCatalogVersionError';
  }
}

export async function fetchRemoteCatalog(
  url?: string,
  etag?: string,
): Promise<FetchResult> {
  const catalogUrl = url ?? DEFAULT_CATALOG_URL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const response = await fetch(catalogUrl, {
      headers,
      signal: controller.signal,
    });

    if (response.status === 304) {
      return { catalog: null as any, notModified: true };
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch remote catalog: ${response.status} ${response.statusText}`,
      );
    }

    const json: unknown = await response.json();

    if (!validateCatalogSchema(json)) {
      throw new Error('Remote catalog does not match expected schema');
    }

    const responseEtag = response.headers.get('etag') ?? undefined;

    return {
      catalog: json,
      etag: responseEtag,
      notModified: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}
