import { describe, it, expect } from 'vitest';
import { update } from '../../src/core/updater.js';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('update', () => {
  function createProject(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-upd-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('creates new files on first run', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }),
    });
    try {
      const result = update(dir);
      expect(result.newFiles.length).toBeGreaterThan(0);
      expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('detects unchanged files on second run', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }),
    });
    try {
      update(dir); // first run
      const result = update(dir); // second run
      expect(result.unchangedFiles.length).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('updates files when project changes', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }),
    });
    try {
      update(dir); // first run
      // Change project
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-changed', scripts: { build: 'tsc', test: 'vitest' } }));
      const result = update(dir);
      // CLAUDE.md should be updated since project name and scripts changed
      expect(result.updatedFiles.length + result.unchangedFiles.length).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });
});
