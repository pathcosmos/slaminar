import { describe, it, expect } from 'vitest';
import { scoreTool } from '../../src/recommender/scorer.js';
import type { CatalogTool, ProjectProfile } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test', description: '', maturity: 'growing',
    language: { primary: 'typescript', secondary: ['css'], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: [], testPattern: null, srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: null, linter: 'eslint', formatter: null, commitStyle: 'conventional', docLanguage: 'ko' },
    dependencies: { total: 20, notable: [{ name: 'react', category: 'ui-framework' }], devTools: ['typescript', 'vite'] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

function makeTool(overrides: Partial<CatalogTool> = {}): CatalogTool {
  return {
    name: 'test-tool', repo: 'user/repo', category: 'skill', description: 'test',
    authRequired: false, networkRequired: 'none', installMethod: 'marketplace',
    installCommands: ['install test'], prerequisites: [], tags: [],
    maturityFit: ['early', 'growing', 'mature'],
    ...overrides,
  };
}

describe('scoreTool', () => {
  it('scores higher for matching tags', () => {
    const profile = makeProfile();
    const frontendTool = makeTool({ tags: ['frontend', 'react'] });
    const backendTool = makeTool({ tags: ['backend', 'python'] });
    expect(scoreTool(frontendTool, profile).score).toBeGreaterThan(scoreTool(backendTool, profile).score);
  });

  it('scores zero for auth-required', () => {
    expect(scoreTool(makeTool({ authRequired: true }), makeProfile()).score).toBe(0);
  });

  it('scores lower for maturity mismatch', () => {
    const profile = makeProfile({ maturity: 'greenfield' });
    const matureTool = makeTool({ maturityFit: ['mature'] });
    const universalTool = makeTool({ maturityFit: ['greenfield', 'early', 'growing', 'mature'] });
    expect(scoreTool(universalTool, profile).score).toBeGreaterThan(scoreTool(matureTool, profile).score);
  });

  it('provides reasons', () => {
    const result = scoreTool(makeTool({ tags: ['frontend'] }), makeProfile());
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('scores universal tags positively', () => {
    const result = scoreTool(makeTool({ tags: ['universal'] }), makeProfile());
    expect(result.score).toBeGreaterThan(30);
  });
});
