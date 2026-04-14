import { describe, it, expect } from 'vitest';
import { generateClaudeMd } from '../../src/generator/claude-md.js';
import type { ProjectProfile, ProjectSnapshot } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test-app', description: 'A test application', maturity: 'growing',
    language: { primary: 'typescript', secondary: ['css'], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: ['src/main.tsx'], testPattern: 'tests/**/*.test.ts', srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: 'vitest', linter: 'eslint', formatter: 'prettier', commitStyle: 'conventional', docLanguage: 'ko' },
    dependencies: { total: 15, notable: [{ name: 'react', category: 'ui-framework' }, { name: '@anthropic-ai/sdk', category: 'ai' }], devTools: ['typescript', 'vitest', 'vite'] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    root: '/tmp/test', fileTree: [], fileStats: {}, git: null,
    existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '',
    packages: [{
      manager: 'npm', name: 'test-app', version: '1.0.0', description: 'A test',
      scripts: { build: 'tsc', dev: 'vite', test: 'vitest run', lint: 'eslint .' },
      dependencies: ['react'], devDependencies: ['typescript', 'vitest'],
      filePath: 'package.json',
    }],
    ...overrides,
  };
}

describe('generateClaudeMd', () => {
  it('includes header', () => {
    const md = generateClaudeMd(makeProfile(), makeSnapshot());
    expect(md).toContain('# CLAUDE.md');
    expect(md).toContain('claude.ai/code');
  });

  it('includes ownership markers', () => {
    const md = generateClaudeMd(makeProfile(), makeSnapshot());
    expect(md).toContain('<!-- slaminar:begin:overview -->');
    expect(md).toContain('<!-- slaminar:end:overview -->');
    expect(md).toContain('<!-- slaminar:begin:commands -->');
    expect(md).toContain('<!-- slaminar:end:commands -->');
  });

  it('includes build commands from scripts', () => {
    const md = generateClaudeMd(makeProfile(), makeSnapshot());
    expect(md).toContain('npm run build');
    expect(md).toContain('npm run test');
  });

  it('includes language and framework info', () => {
    const md = generateClaudeMd(makeProfile(), makeSnapshot());
    expect(md).toContain('typescript');
    expect(md).toContain('react');
  });

  it('includes conventions', () => {
    const md = generateClaudeMd(makeProfile(), makeSnapshot());
    expect(md).toContain('vitest');
    expect(md).toContain('eslint');
  });

  it('handles empty scripts', () => {
    const snap = makeSnapshot({ packages: [{ manager: 'npm', name: 'x', version: '1.0.0', description: null, scripts: {}, dependencies: [], devDependencies: [], filePath: 'package.json' }] });
    const md = generateClaudeMd(makeProfile(), snap);
    expect(md).toContain('CLAUDE.md');  // should not crash
  });
});
