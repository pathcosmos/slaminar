import { describe, it, expect } from 'vitest';
import { runCheck } from '../../src/ci/check.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('runCheck', () => {
  function createDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-ci-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('returns 0 for healthy setup', () => {
    const dir = createDir({
      'CLAUDE.md': '# CLAUDE.md\n## Overview\nhello',
      'package.json': JSON.stringify({ scripts: {} }),
      '.claude/plugins/slaminar-generated/plugin.json': JSON.stringify({ name: 'test', description: 'test', version: '1.0.0', skills: './skills' }),
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    try {
      const result = runCheck(dir);
      expect(result.exitCode).toBe(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('returns 2 for broken setup', () => {
    const dir = createDir({ 'package.json': '{}' }); // no CLAUDE.md, no plugin
    try {
      const result = runCheck(dir);
      expect(result.exitCode).toBe(2);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('includes summary string', () => {
    const dir = createDir({ 'package.json': '{}' });
    try {
      const result = runCheck(dir);
      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
    } finally { rmSync(dir, { recursive: true }); }
  });
});
