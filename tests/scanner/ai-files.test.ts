import { describe, it, expect } from 'vitest';
import { scanAiFiles } from '../../src/scanner/ai-files.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanAiFiles', () => {
  function createTempDir(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-ai-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('returns empty for project with no AI files', () => {
    const dir = createTempDir({ 'src/index.ts': '' });
    try { expect(scanAiFiles(dir)).toEqual([]); }
    finally { rmSync(dir, { recursive: true }); }
  });

  it('detects CLAUDE.md', () => {
    const dir = createTempDir({ 'CLAUDE.md': 'line1\nline2\nline3' });
    try {
      const result = scanAiFiles(dir);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('claude-md');
      expect(result[0].lineCount).toBe(3);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('detects .claude/settings.json', () => {
    const dir = createTempDir({ '.claude/settings.json': '{}' });
    try {
      const result = scanAiFiles(dir);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('claude-settings');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('detects multiple AI files', () => {
    const dir = createTempDir({
      'CLAUDE.md': 'content',
      '.claude/settings.json': '{}',
      '.claude/settings.local.json': '{}',
    });
    try {
      const result = scanAiFiles(dir);
      expect(result.length).toBeGreaterThanOrEqual(2);
    } finally { rmSync(dir, { recursive: true }); }
  });
});
