import { describe, it, expect } from 'vitest';
import { validatePlugin } from '../../src/validator/plugin-schema.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validatePlugin', () => {
  function createDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-pval-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('fails when plugin.json missing', () => {
    const dir = createDir({ 'package.json': '{}' });
    try {
      const result = validatePlugin(dir);
      expect(result.failCount).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('passes for valid plugin', () => {
    const dir = createDir({
      '.claude/plugins/slaminar-generated/plugin.json': JSON.stringify({ name: 'test', description: 'test', version: '1.0.0', skills: './skills' }),
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    try {
      const result = validatePlugin(dir);
      expect(result.failCount).toBe(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('fails for invalid JSON', () => {
    const dir = createDir({
      '.claude/plugins/slaminar-generated/plugin.json': 'not json',
    });
    try {
      const result = validatePlugin(dir);
      expect(result.failCount).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('fails for missing required fields', () => {
    const dir = createDir({
      '.claude/plugins/slaminar-generated/plugin.json': JSON.stringify({ name: 'test' }),
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    try {
      const result = validatePlugin(dir);
      expect(result.checks.some(c => c.status === 'fail')).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });
});
