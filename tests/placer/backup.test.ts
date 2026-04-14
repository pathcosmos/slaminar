import { describe, it, expect } from 'vitest';
import { backupFile, restoreFile, readManifest, writeManifest } from '../../src/placer/backup.js';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('backup', () => {
  function createDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-bk-test-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      const { mkdirSync } = require('node:fs');
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('backs up a file with obfuscated name', () => {
    const dir = createDir({ 'CLAUDE.md': 'original content' });
    try {
      const record = backupFile(dir, 'CLAUDE.md');
      expect(record.originalPath).toBe('CLAUDE.md');
      expect(record.backupPath).toMatch(/\.slaminar\/\.bk\/[a-f0-9]{6}_\d+\.dat/);
      expect(existsSync(join(dir, record.backupPath))).toBe(true);
      expect(readFileSync(join(dir, record.backupPath), 'utf-8')).toBe('original content');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('restores a backed-up file', () => {
    const dir = createDir({ 'CLAUDE.md': 'original' });
    try {
      const record = backupFile(dir, 'CLAUDE.md');
      writeFileSync(join(dir, 'CLAUDE.md'), 'modified');
      restoreFile(dir, record);
      expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf-8')).toBe('original');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('reads and writes manifest', () => {
    const dir = createDir({});
    try {
      const records = [{ originalPath: 'CLAUDE.md', backupPath: '.slaminar/.bk/abc123_123.dat', timestamp: 123 }];
      writeManifest(dir, records);
      const read = readManifest(dir);
      expect(read).toEqual(records);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('returns empty array when no manifest exists', () => {
    const dir = createDir({});
    try {
      expect(readManifest(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
