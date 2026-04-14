import { describe, it, expect } from 'vitest';
import { uninstall, removeTool } from '../../src/rollback/uninstaller.js';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { backupFile, writeManifest } from '../../src/placer/backup.js';

describe('uninstall', () => {
  function createDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-uninst-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('restores backed-up files', () => {
    const dir = createDir({
      'CLAUDE.md': 'original content',
      '.claude/plugins/slaminar-generated/plugin.json': '{}',
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    // Create a backup
    const record = backupFile(dir, 'CLAUDE.md');
    writeManifest(dir, [record]);
    // Overwrite original
    writeFileSync(join(dir, 'CLAUDE.md'), 'modified by slaminar');
    try {
      const result = uninstall(dir);
      expect(result.restoredFiles).toContain('CLAUDE.md');
      expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf-8')).toBe('original content');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('deletes slaminar-generated plugin dir', () => {
    const dir = createDir({
      '.claude/plugins/slaminar-generated/plugin.json': '{}',
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    try {
      const result = uninstall(dir);
      expect(existsSync(join(dir, '.claude/plugins/slaminar-generated'))).toBe(false);
      expect(result.deletedDirs.length).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('deletes .slaminar directory', () => {
    const dir = createDir({
      '.slaminar/config.json': '{}',
    });
    try {
      uninstall(dir);
      expect(existsSync(join(dir, '.slaminar'))).toBe(false);
    } finally { rmSync(dir, { recursive: true }); }
  });
});

describe('removeTool', () => {
  it('removes tool from team config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-rm-'));
    mkdirSync(join(dir, '.slaminar'), { recursive: true });
    writeFileSync(join(dir, '.slaminar/config.json'), JSON.stringify({
      slaminarVersion: '0.1.0', excludeAuthTools: true, fileCountCap: 10000,
      approvedTools: ['caveman', 'impeccable'], catalogVersion: '',
    }));
    try {
      removeTool(dir, 'caveman');
      const cfg = JSON.parse(readFileSync(join(dir, '.slaminar/config.json'), 'utf-8'));
      expect(cfg.approvedTools).not.toContain('caveman');
      expect(cfg.approvedTools).toContain('impeccable');
    } finally { rmSync(dir, { recursive: true }); }
  });
});
