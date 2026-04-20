import { describe, it, expect } from 'vitest';
import { validateClaudeMd } from '../../src/validator/claude-md.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validateClaudeMd', () => {
  function createDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-val-'));
    for (const [p, c] of Object.entries(files)) {
      const fp = join(dir, p);
      mkdirSync(join(fp, '..'), { recursive: true });
      writeFileSync(fp, c);
    }
    return dir;
  }

  it('fails when CLAUDE.md missing', () => {
    const dir = createDir({ 'package.json': '{}' });
    try {
      const result = validateClaudeMd(dir);
      expect(result.failCount).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('passes for valid CLAUDE.md', () => {
    const dir = createDir({
      'CLAUDE.md': '# CLAUDE.md\n## Overview\nhello\n<!-- slaminar:begin:test -->\ncontent\n<!-- slaminar:end:test -->',
      'package.json': '{}',
    });
    try {
      const result = validateClaudeMd(dir);
      expect(result.failCount).toBe(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('warns for commands not in package.json', () => {
    const dir = createDir({
      'CLAUDE.md': '## Commands\n`npm run nonexistent`',
      'package.json': JSON.stringify({ scripts: { build: 'tsc' } }),
    });
    try {
      const result = validateClaudeMd(dir);
      expect(result.warnCount).toBeGreaterThan(0);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('fails for mismatched markers', () => {
    const dir = createDir({
      'CLAUDE.md': '<!-- slaminar:begin:test -->\ncontent\n<!-- slaminar:end:other -->',
      'package.json': '{}',
    });
    try {
      const result = validateClaudeMd(dir);
      expect(result.checks.some(c => c.status === 'fail' || c.status === 'warn')).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('ignores marker-like strings inside inline code spans', () => {
    const dir = createDir({
      'CLAUDE.md': [
        '# CLAUDE.md',
        '## Key Patterns',
        '- Ownership markers (`<!-- slaminar:begin:SECTION -->`) track generated sections',
        '',
        '<!-- slaminar:begin:overview -->',
        'content',
        '<!-- slaminar:end:overview -->',
      ].join('\n'),
      'package.json': '{}',
    });
    try {
      const result = validateClaudeMd(dir);
      const marker = result.checks.find(c => c.name === 'markers-well-formed');
      expect(marker?.status).toBe('pass');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('ignores marker-like strings inside fenced code blocks', () => {
    const dir = createDir({
      'CLAUDE.md': [
        '# CLAUDE.md',
        '## Example',
        '```',
        '<!-- slaminar:begin:SECTION -->',
        'body',
        '<!-- slaminar:end:SECTION -->',
        '```',
        '',
        '<!-- slaminar:begin:real -->',
        'content',
        '<!-- slaminar:end:real -->',
      ].join('\n'),
      'package.json': '{}',
    });
    try {
      const result = validateClaudeMd(dir);
      const marker = result.checks.find(c => c.name === 'markers-well-formed');
      expect(marker?.status).toBe('pass');
    } finally { rmSync(dir, { recursive: true }); }
  });
});
