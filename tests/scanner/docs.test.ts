import { describe, it, expect } from 'vitest';
import { scan } from '../../src/core/scanner.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanDocs - docs/ directory', () => {
  function createProject(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('scans docs/ subdirectory', () => {
    const dir = createProject({
      'README.md': '# Hello',
      'docs/guide.md': '# Guide\nLine 2',
      'docs/api/reference.md': '# API Ref',
    });
    try {
      const snapshot = scan(dir);
      expect(snapshot.docs.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.docs.some(d => d.path.includes('docs/guide.md'))).toBe(true);
      expect(snapshot.docs.some(d => d.path.includes('docs/api/reference.md'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('handles missing docs/ directory gracefully', () => {
    const dir = createProject({
      'README.md': '# Hello',
    });
    try {
      const snapshot = scan(dir);
      expect(snapshot.docs.length).toBe(1);
      expect(snapshot.docs[0].path).toBe('README.md');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('counts lines correctly for docs/ files', () => {
    const dir = createProject({
      'docs/guide.md': '# Guide\nLine 2\nLine 3',
    });
    try {
      const snapshot = scan(dir);
      const guide = snapshot.docs.find(d => d.path === 'docs/guide.md');
      expect(guide).toBeDefined();
      expect(guide!.lineCount).toBe(3);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
