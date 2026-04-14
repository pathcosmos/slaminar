import { describe, it, expect } from 'vitest';
import { generatePlugin } from '../../src/generator/claude-plugin.js';
import type { ProjectProfile, ProjectSnapshot } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test-app', description: 'A test app', maturity: 'growing',
    language: { primary: 'typescript', secondary: [], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: [], testPattern: null, srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: 'vitest', linter: 'eslint', formatter: null, commitStyle: 'conventional', docLanguage: 'en' },
    dependencies: { total: 10, notable: [], devTools: [] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

function makeSnapshot(): ProjectSnapshot {
  return {
    root: '/tmp/test', fileTree: [], fileStats: {}, git: null,
    existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '',
    packages: [{ manager: 'npm', name: 'test-app', version: '1.0.0', description: null, scripts: { build: 'tsc', test: 'vitest run', dev: 'vite' }, dependencies: [], devDependencies: [], filePath: 'package.json' }],
  };
}

describe('generatePlugin', () => {
  it('generates plugin.json and dev skill', () => {
    const targets = generatePlugin(makeProfile(), makeSnapshot());
    expect(targets.length).toBe(2);
    expect(targets.some(t => t.path.endsWith('plugin.json'))).toBe(true);
    expect(targets.some(t => t.path.endsWith('dev.md'))).toBe(true);
  });

  it('plugin.json is valid JSON', () => {
    const targets = generatePlugin(makeProfile(), makeSnapshot());
    const pluginTarget = targets.find(t => t.path.endsWith('plugin.json'))!;
    const parsed = JSON.parse(pluginTarget.content);
    expect(parsed.name).toBe('slaminar-generated');
  });

  it('dev skill includes commands', () => {
    const targets = generatePlugin(makeProfile(), makeSnapshot());
    const devSkill = targets.find(t => t.path.endsWith('dev.md'))!;
    expect(devSkill.content).toContain('npm run build');
    expect(devSkill.content).toContain('npm run test');
  });

  it('all targets are mode create', () => {
    const targets = generatePlugin(makeProfile(), makeSnapshot());
    expect(targets.every(t => t.mode === 'create')).toBe(true);
  });
});
