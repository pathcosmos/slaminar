import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mergeWithMarkers } from './markers.js';
import type { GenerationTarget } from '../types/index.js';

export function writeTargets(root: string, targets: GenerationTarget[]): string[] {
  const written: string[] = [];

  for (const target of targets) {
    const fullPath = join(root, target.path);
    const dir = dirname(fullPath);
    mkdirSync(dir, { recursive: true });

    if (target.mode === 'merge' && existsSync(fullPath)) {
      const existing = readFileSync(fullPath, 'utf-8');
      const merged = mergeWithMarkers(existing, target.content);
      writeFileSync(fullPath, merged, 'utf-8');
    } else {
      writeFileSync(fullPath, target.content, 'utf-8');
    }
    written.push(target.path);
  }

  return written;
}
