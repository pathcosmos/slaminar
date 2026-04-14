import { describe, it, expect } from 'vitest';
import { verify } from '../../src/core/verifier.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('verify', () => {
  function createDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-verify-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('passes for fully valid project', () => {
    const dir = createDir({
      'CLAUDE.md': '# CLAUDE.md\n## Overview\nhello',
      'package.json': JSON.stringify({ scripts: {} }),
      '.claude/plugins/slaminar-generated/plugin.json': JSON.stringify({ name: 'test', description: 'test', version: '1.0.0' }),
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    try {
      const result = verify(dir);
      expect(result.failCount).toBe(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('reports failures from both validators', () => {
    const dir = createDir({ 'package.json': '{}' }); // no CLAUDE.md, no plugin
    try {
      const result = verify(dir);
      expect(result.failCount).toBeGreaterThan(1); // both validators should fail
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('combines checks from all validators', () => {
    const dir = createDir({
      'CLAUDE.md': '# CLAUDE.md\n## Overview',
      'package.json': '{}',
      '.claude/plugins/slaminar-generated/plugin.json': JSON.stringify({ name: 'x', description: 'x', version: '1.0.0' }),
      '.claude/plugins/slaminar-generated/skills/dev.md': '# Dev',
    });
    try {
      const result = verify(dir);
      expect(result.checks.length).toBeGreaterThan(3); // checks from both validators
    } finally { rmSync(dir, { recursive: true }); }
  });
});
