import { describe, it, expect } from 'vitest';
import { extractConventions } from '../../src/analyzer/convention-extractor.js';
import type { ProjectSnapshot } from '../../src/types/index.js';

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return { root: '/tmp/test', fileTree: [], fileStats: {}, packages: [], git: null, existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '', ...overrides };
}

describe('extractConventions', () => {
  it('detects vitest', () => {
    expect(extractConventions(makeSnapshot({ configs: [{ type: 'vitest', path: 'vitest.config.ts' }] })).testFramework).toBe('vitest');
  });
  it('detects eslint', () => {
    expect(extractConventions(makeSnapshot({ configs: [{ type: 'eslint', path: 'eslint.config.js' }] })).linter).toBe('eslint');
  });
  it('detects conventional commits', () => {
    const snap = makeSnapshot({
      git: { totalCommits: 5, recentCommits: [
        { hash: 'a', message: 'feat: add', author: 'A', date: '' },
        { hash: 'b', message: 'fix: bug', author: 'A', date: '' },
        { hash: 'c', message: 'chore: clean', author: 'A', date: '' },
      ], branches: [], contributors: [], currentBranch: 'main' },
    });
    expect(extractConventions(snap).commitStyle).toBe('conventional');
  });
  it('detects camelCase naming from file tree', () => {
    const snap = makeSnapshot({
      fileTree: [
        { name: 'src', path: 'src', type: 'directory', children: [
          { name: 'myComponent.ts', path: 'src/myComponent.ts', type: 'file', extension: '.ts' },
          { name: 'userService.ts', path: 'src/userService.ts', type: 'file', extension: '.ts' },
          { name: 'index.ts', path: 'src/index.ts', type: 'file', extension: '.ts' },
        ]},
      ],
    });
    expect(extractConventions(snap).naming).toBe('camelCase');
  });

  it('detects kebab-case naming', () => {
    const snap = makeSnapshot({
      fileTree: [
        { name: 'my-component.ts', path: 'my-component.ts', type: 'file', extension: '.ts' },
        { name: 'user-service.ts', path: 'user-service.ts', type: 'file', extension: '.ts' },
      ],
    });
    expect(extractConventions(snap).naming).toBe('kebab-case');
  });

  it('detects Korean docs', () => {
    expect(extractConventions(makeSnapshot({ docs: [{ type: 'readme', path: 'README.ko.md', lineCount: 100 }] })).docLanguage).toBe('ko');
  });
});
