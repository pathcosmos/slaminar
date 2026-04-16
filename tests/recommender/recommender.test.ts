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
  it('returns recommendations for React SPA', async () => {
    const plan = await recommend(makeProfile());
    expect(plan.recommended.length).toBeGreaterThan(0);
    expect(plan.recommended.length).toBeLessThanOrEqual(plan.maxTools);
  });

  it('excludes auth-required tools', async () => {
    const plan = await recommend(makeProfile());
    expect(plan.recommended.every(r => !r.tool.authRequired)).toBe(true);
    expect(plan.excluded.some(e => e.reason.includes('auth'))).toBe(true);
  });

  it('limits tools by maturity', async () => {
    const earlyPlan = await recommend(makeProfile({ maturity: 'early' }));
    const maturePlan = await recommend(makeProfile({ maturity: 'mature' }));
    expect(earlyPlan.maxTools).toBe(3);
    expect(maturePlan.maxTools).toBe(7);
  });

  it('sorts by score descending', async () => {
    const plan = await recommend(makeProfile());
    for (let i = 1; i < plan.recommended.length; i++) {
      expect(plan.recommended[i - 1].score).toBeGreaterThanOrEqual(plan.recommended[i].score);
    }
  });

  it('handles greenfield', async () => {
    const plan = await recommend(makeProfile({ maturity: 'greenfield' }));
    expect(plan.recommended.length).toBeLessThanOrEqual(2);
  });

  it('detects conflicts', async () => {
    expect(Array.isArray((await recommend(makeProfile())).conflicts)).toBe(true);
  });
});
