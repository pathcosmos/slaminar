import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from '../auth/config.js';
import type { CatalogCacheEntry } from '../types/index.js';

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const CACHE_FILENAME = 'catalog-cache.json';
export const CACHE_PREV_FILENAME = 'catalog-cache.prev.json';

export function getCachePath(): string {
  return join(getConfigDir(), CACHE_FILENAME);
}

export function loadCache(): CatalogCacheEntry | null {
  const path = getCachePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as CatalogCacheEntry;
  } catch {
    return null;
  }
}

export function saveCache(entry: CatalogCacheEntry): void {
  const path = getCachePath();
  const dir = join(path, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(entry, null, 2), { encoding: 'utf-8', mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // fallback: mode already set via writeFileSync
  }
}

export function isCacheValid(entry: CatalogCacheEntry, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const fetchedAt = new Date(entry.fetchedAt).getTime();
  return (fetchedAt + ttlMs) > Date.now();
}

export function backupCache(): void {
  const current = getCachePath();
  const prev = join(getConfigDir(), CACHE_PREV_FILENAME);
  copyFileSync(current, prev);
}

export function rollbackCache(): boolean {
  const current = getCachePath();
  const prev = join(getConfigDir(), CACHE_PREV_FILENAME);
  if (!existsSync(prev)) return false;
  try {
    copyFileSync(prev, current);
    return true;
  } catch {
    return false;
  }
}
