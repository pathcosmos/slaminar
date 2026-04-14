import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import type { FileNode } from '../types/index.js';

const DEFAULT_EXCLUDES = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', 'target', '.gradle',
  '.idea', '.vscode', '.DS_Store',
]);

interface ScanOptions {
  maxFiles?: number;
}

interface ScanResult {
  tree: FileNode[];
  stats: Record<string, number>;
}

function parseGitignore(root: string): Set<string> {
  const patterns = new Set<string>();
  try {
    const content = readFileSync(join(root, '.gitignore'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        patterns.add(trimmed.replace(/\/$/, ''));
      }
    }
  } catch {
    // no .gitignore
  }
  return patterns;
}

function shouldExclude(name: string, gitignorePatterns: Set<string>): boolean {
  if (DEFAULT_EXCLUDES.has(name)) return true;
  if (gitignorePatterns.has(name)) return true;
  for (const pattern of gitignorePatterns) {
    if (pattern.startsWith('*.') && name.endsWith(pattern.slice(1))) return true;
  }
  return false;
}

export function scanFileTree(root: string, options: ScanOptions = {}): ScanResult {
  const maxFiles = options.maxFiles ?? 10_000;
  const stats: Record<string, number> = {};
  const gitignorePatterns = parseGitignore(root);
  let fileCount = 0;

  function walk(dir: string): FileNode[] {
    const nodes: FileNode[] = [];
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return nodes;
    }

    for (const entry of entries.sort()) {
      if (fileCount >= maxFiles) break;
      if (shouldExclude(entry, gitignorePatterns)) continue;

      const fullPath = join(dir, entry);
      const relPath = relative(root, fullPath);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        const children = walk(fullPath);
        if (children.length > 0) {
          nodes.push({ name: entry, path: relPath, type: 'directory', children });
        }
      } else if (stat.isFile()) {
        fileCount++;
        const ext = extname(entry);
        if (ext) {
          stats[ext] = (stats[ext] ?? 0) + 1;
        }
        nodes.push({ name: entry, path: relPath, type: 'file', extension: ext || undefined });
      }
    }
    return nodes;
  }

  const tree = walk(root);
  return { tree, stats };
}
