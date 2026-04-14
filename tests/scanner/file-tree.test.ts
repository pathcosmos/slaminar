import { describe, it, expect } from 'vitest';
import { scanFileTree } from '../../src/scanner/file-tree.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanFileTree', () => {
  function createTempProject(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('scans files and directories', () => {
    const dir = createTempProject({
      'src/index.ts': 'export {}',
      'src/utils.ts': 'export {}',
      'package.json': '{}',
    });
    try {
      const { tree, stats } = scanFileTree(dir);
      expect(stats['.ts']).toBe(2);
      expect(stats['.json']).toBe(1);
      expect(tree.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('excludes node_modules and .git', () => {
    const dir = createTempProject({
      'src/index.ts': 'export {}',
      'node_modules/foo/index.js': '',
      '.git/HEAD': 'ref: refs/heads/main',
    });
    try {
      const { tree, stats } = scanFileTree(dir);
      expect(stats['.ts']).toBe(1);
      expect(stats['.js']).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('respects .gitignore patterns', () => {
    const dir = createTempProject({
      '.gitignore': 'dist/\n*.log',
      'src/index.ts': 'export {}',
      'dist/bundle.js': '',
      'error.log': '',
    });
    try {
      const { stats } = scanFileTree(dir);
      expect(stats['.ts']).toBe(1);
      expect(stats['.js']).toBeUndefined();
      expect(stats['.log']).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('enforces file count cap', () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      files[`file${i}.txt`] = '';
    }
    const dir = createTempProject(files);
    try {
      const { stats } = scanFileTree(dir, { maxFiles: 10 });
      expect(stats['.txt']).toBe(10);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
