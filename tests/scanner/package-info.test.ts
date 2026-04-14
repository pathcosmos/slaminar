import { describe, it, expect } from 'vitest';
import { scanPackageInfo } from '../../src/scanner/package-info.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanPackageInfo', () => {
  function createTempDir(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-pkg-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('returns empty for no package files', () => {
    const dir = createTempDir({ 'src/index.ts': '' });
    try { expect(scanPackageInfo(dir)).toEqual([]); }
    finally { rmSync(dir, { recursive: true }); }
  });

  it('detects package.json', () => {
    const pkg = JSON.stringify({
      name: 'test-pkg', version: '1.0.0', description: 'A test',
      scripts: { build: 'tsc', test: 'vitest' },
      dependencies: { commander: '^13.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    const dir = createTempDir({ 'package.json': pkg });
    try {
      const result = scanPackageInfo(dir);
      expect(result).toHaveLength(1);
      expect(result[0].manager).toBe('npm');
      expect(result[0].name).toBe('test-pkg');
      expect(result[0].dependencies).toContain('commander');
      expect(result[0].devDependencies).toContain('typescript');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('detects Cargo.toml', () => {
    const dir = createTempDir({ 'Cargo.toml': '[package]\nname = "my-crate"\nversion = "0.1.0"\n' });
    try {
      const result = scanPackageInfo(dir);
      expect(result[0].manager).toBe('cargo');
      expect(result[0].name).toBe('my-crate');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('detects go.mod', () => {
    const dir = createTempDir({ 'go.mod': 'module github.com/user/repo\n\ngo 1.21\n' });
    try {
      const result = scanPackageInfo(dir);
      expect(result[0].manager).toBe('go');
      expect(result[0].name).toBe('github.com/user/repo');
    } finally { rmSync(dir, { recursive: true }); }
  });
});
