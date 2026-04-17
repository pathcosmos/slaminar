import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from '../auth/config.js';
import type { CatalogCacheEntry } from '../types/index.js';

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Legacy single-file cache (v0.2–v0.7). v0.8 keeps writing here for backward
// compat when the source id is 'official'; removed in v0.9.
export const CACHE_FILENAME = 'catalog-cache.json';
export const CACHE_PREV_FILENAME = 'catalog-cache.prev.json';

// v0.8 — per-source cache dir.
export const CACHE_SUBDIR = 'cache';

export function getCachePath(): string {
  return join(getConfigDir(), CACHE_FILENAME);
}

export function getSourceCacheDir(): string {
  return join(getConfigDir(), CACHE_SUBDIR);
}

export function getSourceCachePath(id: string): string {
  // 'official' keeps writing to the legacy path so existing tooling / tests
  // (and rollback files from v0.7 installs) still resolve correctly.
  if (id === 'official') return getCachePath();
  return join(getSourceCacheDir(), `${sanitizeId(id)}.json`);
}

export function getSourceCachePrevPath(id: string): string {
  if (id === 'official') return join(getConfigDir(), CACHE_PREV_FILENAME);
  return join(getSourceCacheDir(), `${sanitizeId(id)}.prev.json`);
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function readEntry(path: string): CatalogCacheEntry | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as CatalogCacheEntry;
  } catch {
    return null;
  }
}

function writeEntry(path: string, entry: CatalogCacheEntry): void {
  const dir = join(path, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(entry, null, 2), { encoding: 'utf-8', mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // fallback: mode already set via writeFileSync
  }
}

// ─── Legacy single-source API (unchanged signature, delegates to per-source) ──

export function loadCache(): CatalogCacheEntry | null {
  return loadSourceCache('official');
}

export function saveCache(entry: CatalogCacheEntry): void {
  saveSourceCache('official', entry);
}

export function backupCache(): void {
  backupSourceCache('official');
}

export function rollbackCache(): boolean {
  return rollbackSourceCache('official');
}

// ─── Per-source API (v0.8) ────────────────────────────────────

export function loadSourceCache(id: string): CatalogCacheEntry | null {
  return readEntry(getSourceCachePath(id));
}

export function saveSourceCache(id: string, entry: CatalogCacheEntry): void {
  writeEntry(getSourceCachePath(id), entry);
}

export function backupSourceCache(id: string): void {
  const current = getSourceCachePath(id);
  if (!existsSync(current)) return;
  const prev = getSourceCachePrevPath(id);
  mkdirSync(join(prev, '..'), { recursive: true });
  copyFileSync(current, prev);
}

export function rollbackSourceCache(id: string): boolean {
  const current = getSourceCachePath(id);
  const prev = getSourceCachePrevPath(id);
  if (!existsSync(prev)) return false;
  try {
    mkdirSync(join(current, '..'), { recursive: true });
    copyFileSync(prev, current);
    return true;
  } catch {
    return false;
  }
}

// ─── Shared helpers ───────────────────────────────────────────

export function isCacheValid(entry: CatalogCacheEntry, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const fetchedAt = new Date(entry.fetchedAt).getTime();
  return (fetchedAt + ttlMs) > Date.now();
}
