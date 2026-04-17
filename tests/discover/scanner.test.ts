import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_DISCOVERY_EXCLUDES,
  discoverProjects,
  expandTilde,
  parseRootsInput,
} from '../../src/discover/scanner.js';

function mkProject(root: string, opts: { withClaudeMd?: boolean; withSlaminar?: boolean; language?: 'ts' | 'py' } = {}): string {
  mkdirSync(root, { recursive: true });
  if (opts.withClaudeMd) writeFileSync(join(root, 'CLAUDE.md'), '# x\n', 'utf-8');
  if (opts.withSlaminar) {
    mkdirSync(join(root, '.slaminar'), { recursive: true });
    writeFileSync(join(root, '.slaminar', 'config.json'), '{"slaminarVersion":"0.6.0"}', 'utf-8');
  }
  if (opts.language === 'ts') {
    writeFileSync(join(root, 'package.json'), '{}', 'utf-8');
    writeFileSync(join(root, 'tsconfig.json'), '{}', 'utf-8');
  } else if (opts.language === 'py') {
    writeFileSync(join(root, 'pyproject.toml'), '', 'utf-8');
  }
  return root;
}

describe('discover/scanner', () => {
  let base: string;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'slaminar-scanner-test-'));
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  describe('parseRootsInput', () => {
    it('splits on commas, whitespace, and newlines', () => {
      const parsed = parseRootsInput('/a/b, /c/d   /e/f');
      expect(parsed).toHaveLength(3);
      expect(parsed.every((p) => p.startsWith('/'))).toBe(true);
    });

    it('accepts arrays too', () => {
      const parsed = parseRootsInput(['/a', '/b']);
      expect(parsed).toHaveLength(2);
    });

    it('expands ~/ to $HOME', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = '/my/home';
      try {
        const parsed = parseRootsInput('~/work');
        expect(parsed[0]).toBe('/my/home/work');
      } finally {
        if (originalHome === undefined) delete process.env.HOME;
        else process.env.HOME = originalHome;
      }
    });
  });

  describe('expandTilde', () => {
    it('handles bare ~ and ~/path', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = '/h';
      try {
        expect(expandTilde('~')).toBe('/h');
        expect(expandTilde('~/x')).toBe('/h/x');
        expect(expandTilde('/abs')).toBe('/abs');
      } finally {
        if (originalHome === undefined) delete process.env.HOME;
        else process.env.HOME = originalHome;
      }
    });
  });

  describe('discoverProjects', () => {
    it('returns empty projects when the root has nothing to find', async () => {
      mkProject(join(base, 'not-a-project'));
      const result = await discoverProjects([base]);
      expect(result.projects).toEqual([]);
      expect(result.roots).toEqual([base]);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('finds projects at depth 1 and classifies them', async () => {
      mkProject(join(base, 'new-proj'), { withClaudeMd: true, language: 'ts' });
      mkProject(join(base, 'configured-proj'), { withSlaminar: true, language: 'py' });
      const result = await discoverProjects([base]);
      expect(result.projects).toHaveLength(2);
      const byStatus = Object.fromEntries(result.projects.map((p) => [p.status, p]));
      expect(byStatus.existing).toBeDefined();
      expect(byStatus.configured).toBeDefined();
    });

    it('does not descend into a confirmed project', async () => {
      const outer = join(base, 'parent-proj');
      mkProject(outer, { withClaudeMd: true, language: 'ts' });
      // Nested project that would also qualify — must be ignored.
      mkProject(join(outer, 'nested', 'child'), { withClaudeMd: true, language: 'ts' });

      const result = await discoverProjects([base]);
      expect(result.projects.map((p) => p.root)).toEqual([outer]);
    });

    it('respects maxDepth', async () => {
      // Put a project at depth 3 — maxDepth 2 should skip it.
      mkProject(join(base, 'a', 'b', 'deep-proj'), { withClaudeMd: true, language: 'ts' });
      const shallow = await discoverProjects([base], { maxDepth: 2 });
      expect(shallow.projects).toHaveLength(0);

      const deep = await discoverProjects([base], { maxDepth: 4 });
      expect(deep.projects).toHaveLength(1);
    });

    it('excludes well-known directories by default', () => {
      expect(DEFAULT_DISCOVERY_EXCLUDES.has('node_modules')).toBe(true);
      expect(DEFAULT_DISCOVERY_EXCLUDES.has('.git')).toBe(true);
      expect(DEFAULT_DISCOVERY_EXCLUDES.has('.cache')).toBe(true);
    });

    it('de-duplicates the roots list', async () => {
      mkProject(join(base, 'proj'), { withClaudeMd: true, language: 'ts' });
      const result = await discoverProjects([base, base, base]);
      expect(result.roots).toEqual([base]);
      expect(result.projects).toHaveLength(1);
    });

    it('continues scanning other roots when one fails', async () => {
      mkProject(join(base, 'real'), { withClaudeMd: true, language: 'ts' });
      const result = await discoverProjects(['/does/not/exist', base]);
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]!.root).toBe(join(base, 'real'));
    });

    it('respects an abort signal', async () => {
      mkProject(join(base, 'x'), { withClaudeMd: true, language: 'ts' });
      const ac = new AbortController();
      ac.abort();
      const result = await discoverProjects([base], { signal: ac.signal });
      expect(result.projects).toEqual([]);
    });
  });
});
