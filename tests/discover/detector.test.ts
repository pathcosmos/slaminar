import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { classifyProject } from '../../src/discover/detector.js';

describe('discover/detector', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'slaminar-detector-test-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('classifies a directory with .slaminar/config.json as "configured"', () => {
    mkdirSync(join(root, '.slaminar'), { recursive: true });
    writeFileSync(
      join(root, '.slaminar', 'config.json'),
      JSON.stringify({ slaminarVersion: '0.6.1' }),
      'utf-8',
    );
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');

    const p = classifyProject(root);
    expect(p.status).toBe('configured');
    expect(p.suggestedAction).toBe('update');
    expect(p.slaminarVersion).toBe('0.6.1');
  });

  it('classifies a directory with only CLAUDE.md as "existing"', () => {
    writeFileSync(join(root, 'CLAUDE.md'), '# Project\n', 'utf-8');
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');

    const p = classifyProject(root);
    expect(p.status).toBe('existing');
    expect(p.suggestedAction).toBe('init-merge');
    expect(p.hasClaudeMd).toBe(true);
    expect(p.claudeMdLines).toBe(2);
    expect(p.signatures).toContain('CLAUDE.md');
  });

  it('classifies a directory with .claude/ but no CLAUDE.md as "new"', () => {
    mkdirSync(join(root, '.claude'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');

    const p = classifyProject(root);
    expect(p.status).toBe('new');
    expect(p.suggestedAction).toBe('init');
    expect(p.signatures).toContain('claude-dir');
  });

  it('classifies as "unsupported" when language cannot be detected', () => {
    mkdirSync(join(root, '.claude'), { recursive: true });
    // Nothing that would reveal language — no manifest, no source files.
    const p = classifyProject(root);
    expect(p.status).toBe('unsupported');
    expect(p.suggestedAction).toBe('skip');
    expect(p.skipReason).toMatch(/language/i);
  });

  it('detects typescript vs javascript via tsconfig.json', () => {
    writeFileSync(join(root, 'CLAUDE.md'), '# x\n', 'utf-8');
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');
    const jsProject = classifyProject(root);
    expect(jsProject.language).toBe('javascript');

    writeFileSync(join(root, 'tsconfig.json'), '{}', 'utf-8');
    const tsProject = classifyProject(root);
    expect(tsProject.language).toBe('typescript');
  });

  it('detects rust / python / go via manifest files', () => {
    writeFileSync(join(root, 'CLAUDE.md'), '# x\n', 'utf-8');

    writeFileSync(join(root, 'Cargo.toml'), '', 'utf-8');
    expect(classifyProject(root).language).toBe('rust');
    rmSync(join(root, 'Cargo.toml'));

    writeFileSync(join(root, 'pyproject.toml'), '', 'utf-8');
    expect(classifyProject(root).language).toBe('python');
    rmSync(join(root, 'pyproject.toml'));

    writeFileSync(join(root, 'go.mod'), '', 'utf-8');
    expect(classifyProject(root).language).toBe('go');
  });

  it('collects .claude/settings.json and plugins/ as extra signatures', () => {
    mkdirSync(join(root, '.claude', 'plugins'), { recursive: true });
    writeFileSync(join(root, '.claude', 'settings.json'), '{}', 'utf-8');
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');

    const p = classifyProject(root);
    expect(p.signatures).toEqual(
      expect.arrayContaining(['claude-dir', 'claude-settings', 'claude-plugins']),
    );
  });

  it('returns null slaminarVersion when the config file is corrupt', () => {
    mkdirSync(join(root, '.slaminar'), { recursive: true });
    writeFileSync(join(root, '.slaminar', 'config.json'), '{{{not json', 'utf-8');
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');

    const p = classifyProject(root);
    expect(p.status).toBe('configured');
    expect(p.slaminarVersion).toBeNull();
  });
});
