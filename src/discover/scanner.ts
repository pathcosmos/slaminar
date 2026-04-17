/**
 * Project discovery walker — scans user-specified roots for Claude Code
 * projects. Intentionally light-weight: stops recursing into a directory as
 * soon as a Claude Code signature is detected, so `$HOME`-wide scans stay
 * fast even with many nested projects.
 *
 * Safety:
 *   - Symbolic links are not followed (cycle prevention); visited inodes
 *     are also tracked via realpath as a secondary guard.
 *   - Everything inside `node_modules/`, `.git/`, etc. is skipped by name.
 *   - Any readdir / stat failure on a single dir is captured and the scan
 *     continues with the next one.
 */

import { readdirSync, realpathSync, type Dirent } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { DEFAULT_EXCLUDES } from '../scanner/file-tree.js';
import { classifyProject } from './detector.js';
import type {
  DiscoverOptions,
  DiscoveredProject,
  DiscoveryResult,
} from '../types/index.js';

// Names we always skip when walking ~/ or other user-specified roots.
// Superset of `DEFAULT_EXCLUDES` (for project-internal walks) with entries
// that matter more at the filesystem-tree level than inside a single repo.
const EXTRA_DISCOVERY_EXCLUDES = new Set<string>([
  '.tox',
  '.pytest_cache',
  '.parcel-cache',
  '.terraform',
  '.turbo',
  'out',
  'coverage',
  '.mypy_cache',
  '.ruff_cache',
  '.cache',
  '.yarn',
  '.pnpm-store',
]);

const MAC_EXCLUDES = new Set<string>([
  'Library',
  'Applications',
  'Music',
  'Movies',
  'Pictures',
]);

export const DEFAULT_DISCOVERY_EXCLUDES: Set<string> = new Set([
  ...DEFAULT_EXCLUDES,
  ...EXTRA_DISCOVERY_EXCLUDES,
  ...(platform() === 'darwin' ? MAC_EXCLUDES : []),
]);

export function expandTilde(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

export function parseRootsInput(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => resolve(expandTilde(s)));
}

function toExcludeSet(extra?: string[]): Set<string> {
  if (!extra || extra.length === 0) return DEFAULT_DISCOVERY_EXCLUDES;
  return new Set([...DEFAULT_DISCOVERY_EXCLUDES, ...extra]);
}

function readEntries(dir: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function looksLikeProjectShallow(dir: string, entries: Dirent[]): boolean {
  for (const e of entries) {
    if (!e.isDirectory() && !e.isFile() && !e.isSymbolicLink()) continue;
    const name = e.name;
    if (name === 'CLAUDE.md') return true;
    if (name === '.claude' && e.isDirectory()) return true;
    if (name === '.slaminar' && e.isDirectory()) return true;
  }
  return false;
}

export async function discoverProjects(
  rootsInput: string[],
  options: DiscoverOptions = {},
): Promise<DiscoveryResult> {
  const started = Date.now();
  const maxDepth = options.maxDepth ?? 4;
  const excludeSet = toExcludeSet(options.excludePatterns);
  const followSymlinks = options.followSymlinks ?? false;
  const signal = options.signal;

  // De-dup and normalize roots (already expanded by parseRootsInput caller usually).
  const seenRoots = new Set<string>();
  const roots = rootsInput
    .map((r) => resolve(expandTilde(r)))
    .filter((r) => {
      if (seenRoots.has(r)) return false;
      seenRoots.add(r);
      return true;
    });

  const projects: DiscoveredProject[] = [];
  const visitedInodes = new Set<string>();
  let totalCandidatesChecked = 0;
  let excludedDirs = 0;
  let aborted = false;

  function throwIfAborted(): void {
    if (signal?.aborted) {
      aborted = true;
      throw new Error('discover aborted');
    }
  }

  function realKey(path: string): string | null {
    try {
      return realpathSync(path);
    } catch {
      return null;
    }
  }

  async function walk(dir: string, depth: number): Promise<void> {
    throwIfAborted();
    if (depth > maxDepth) return;

    const key = realKey(dir);
    if (key) {
      if (visitedInodes.has(key)) return;
      visitedInodes.add(key);
    }

    const entries = readEntries(dir);
    totalCandidatesChecked += 1;

    if (looksLikeProjectShallow(dir, entries)) {
      const classified = classifyProject(dir);
      projects.push(classified);
      return; // Do not descend into a confirmed project.
    }

    for (const e of entries) {
      throwIfAborted();

      if (excludeSet.has(e.name)) {
        excludedDirs += 1;
        continue;
      }
      if (e.name.startsWith('.') && e.name !== '.claude' && e.name !== '.slaminar') {
        // Skip hidden directories by default — too noisy at HOME level.
        excludedDirs += 1;
        continue;
      }

      const child = join(dir, e.name);
      if (e.isSymbolicLink() && !followSymlinks) continue;
      if (!e.isDirectory()) continue;

      await walk(child, depth + 1);
    }
  }

  try {
    for (const root of roots) {
      try {
        await walk(root, 0);
      } catch (err) {
        // If this root was aborted, propagate; otherwise swallow root-level
        // failures so other roots still get scanned.
        if (aborted) break;
        if (err instanceof Error && err.message === 'discover aborted') break;
      }
    }
  } catch {
    // aborted
  }

  return {
    roots,
    projects,
    totalCandidatesChecked,
    excludedDirs,
    scannedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
  };
}
