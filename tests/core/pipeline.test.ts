import { describe, it, expect } from 'vitest';
import { analyze, init } from '../../src/core/pipeline.js';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'slaminar-pipe-'));
  for (const [p, c] of Object.entries(files)) {
    const fp = join(dir, p);
    mkdirSync(join(fp, '..'), { recursive: true });
    writeFileSync(fp, c);
  }
  return dir;
}

describe('analyze', () => {
  it('returns valid profile for npm project', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test-app', scripts: { build: 'tsc' }, dependencies: { commander: '^13' } }),
    });
    try {
      const { profile } = analyze(dir);
      expect(profile.name).toBe('test-app');
      expect(profile.structure.pattern).toBe('cli');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('returns greenfield for empty directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-empty-'));
    try {
      const { profile } = analyze(dir);
      expect(profile.maturity).toBe('greenfield');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('detects React SPA from package.json with react dep and vite config', () => {
    const dir = createProject({
      'package.json': JSON.stringify({
        name: 'my-react-app',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { react: '^18', 'react-dom': '^18' },
        devDependencies: { vite: '^5' },
      }),
      'vite.config.ts': 'export default {}',
    });
    try {
      const { profile } = analyze(dir);
      expect(profile.structure.pattern).toBe('spa');
      expect(profile.name).toBe('my-react-app');
    } finally { rmSync(dir, { recursive: true }); }
  });
});

describe('init', () => {
  it('creates CLAUDE.md', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }),
    });
    try {
      init(dir);
      expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('creates plugin.json', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: {} }),
    });
    try {
      init(dir);
      expect(existsSync(join(dir, '.claude/plugins/slaminar-generated/plugin.json'))).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('creates .slaminar/.gitignore', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: {} }),
    });
    try {
      init(dir);
      const gi = readFileSync(join(dir, '.slaminar/.gitignore'), 'utf-8');
      expect(gi).toContain('config.local.json');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('saves team config with approvedTools', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: {} }),
    });
    try {
      init(dir);
      const cfg = JSON.parse(readFileSync(join(dir, '.slaminar/config.json'), 'utf-8'));
      expect(Array.isArray(cfg.approvedTools)).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('backs up existing CLAUDE.md', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: {} }),
      'CLAUDE.md': '# Original content',
    });
    try {
      init(dir);
      expect(existsSync(join(dir, '.slaminar/.bk/manifest.json'))).toBe(true);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('dry-run does not write files', () => {
    const dir = createProject({
      'package.json': JSON.stringify({ name: 'test', scripts: {} }),
    });
    try {
      const result = init(dir, { dryRun: true });
      expect(result.writtenFiles.length).toBeGreaterThan(0);
      expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
      expect(existsSync(join(dir, '.slaminar'))).toBe(false);
    } finally { rmSync(dir, { recursive: true }); }
  });
});
