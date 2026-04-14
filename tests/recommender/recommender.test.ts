import { describe, it, expect } from 'vitest';
import { recommend } from '../../src/recommender/recommender.js';
import type { ProjectProfile } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test', description: '', maturity: 'growing',
    language: { primary: 'typescript', secondary: ['css'], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: [], testPattern: null, srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: null, linter: 'eslint', formatter: null, commitStyle: 'conventional', docLanguage: 'ko' },
    dependencies: { total: 20, notable: [{ name: 'react', category: 'ui-framework' }], devTools: ['typescript'] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

describe('recommend', () => {
  it('returns recommendations for React SPA', () => {
    const plan = recommend(makeProfile());
    expect(plan.recommended.length).toBeGreaterThan(0);
    expect(plan.recommended.length).toBeLessThanOrEqual(plan.maxTools);
  });

  it('excludes auth-required tools', () => {
    const plan = recommend(makeProfile());
    expect(plan.recommended.every(r => !r.tool.authRequired)).toBe(true);
    expect(plan.excluded.some(e => e.reason.includes('auth'))).toBe(true);
  });

  it('limits tools by maturity', () => {
    const earlyPlan = recommend(makeProfile({ maturity: 'early' }));
    const maturePlan = recommend(makeProfile({ maturity: 'mature' }));
    expect(earlyPlan.maxTools).toBe(3);
    expect(maturePlan.maxTools).toBe(7);
  });

  it('sorts by score descending', () => {
    const plan = recommend(makeProfile());
    for (let i = 1; i < plan.recommended.length; i++) {
      expect(plan.recommended[i - 1].score).toBeGreaterThanOrEqual(plan.recommended[i].score);
    }
  });

  it('handles greenfield', () => {
    const plan = recommend(makeProfile({ maturity: 'greenfield' }));
    expect(plan.recommended.length).toBeLessThanOrEqual(2);
  });

  it('detects conflicts', () => {
    expect(Array.isArray(recommend(makeProfile()).conflicts)).toBe(true);
  });
});
