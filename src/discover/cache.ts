/**
 * Discovery-cache I/O — mirrors the shape of catalog-cache but keyed to the
 * last `slaminar discover` result so repeated invocations in setup don't
 * re-walk the filesystem unnecessarily.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from '../auth/config.js';
import type { DiscoveryCacheEntry, DiscoveryResult } from '../types/index.js';

export const DEFAULT_DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;
export const DISCOVERY_CACHE_FILENAME = 'discovery-cache.json';

export function getDiscoveryCachePath(): string {
  return join(getConfigDir(), DISCOVERY_CACHE_FILENAME);
}

export function loadDiscoveryCache(): DiscoveryCacheEntry | null {
  const path = getDiscoveryCachePath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (parsed.version !== 1) return null;
    return parsed as DiscoveryCacheEntry;
  } catch {
    return null;
  }
}

export function saveDiscoveryCache(result: DiscoveryResult): string {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  const path = getDiscoveryCachePath();
  const entry: DiscoveryCacheEntry = {
    version: 1,
    result,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
  return path;
}

export function isDiscoveryCacheValid(
  entry: DiscoveryCacheEntry,
  ttlMs: number = DEFAULT_DISCOVERY_TTL_MS,
): boolean {
  const fetchedAt = new Date(entry.fetchedAt).getTime();
  if (Number.isNaN(fetchedAt)) return false;
  return fetchedAt + ttlMs > Date.now();
}
