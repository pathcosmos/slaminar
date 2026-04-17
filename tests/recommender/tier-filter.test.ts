import { describe, it, expect } from 'vitest';
import { filterByTier } from '../../src/recommender/tier-filter.js';
import type { CatalogTool, ScoredTool, TokenCost } from '../../src/types/index.js';

function makeScored(name: string, score: number, cost: TokenCost, extra: Partial<CatalogTool> = {}): ScoredTool {
  const tool: CatalogTool = {
    name,
    repo: `example/${name}`,
    category: 'skill',
    description: '',
    authRequired: false,
    networkRequired: 'none',
    installMethod: 'npx',
    installCommands: [],
    prerequisites: [],
    tags: [],
    maturityFit: ['greenfield', 'early', 'growing', 'mature'],
    tokenCost: cost,
    ...extra,
  };
  return { tool, score, reasons: [] };
}

describe('filterByTier', () => {
  it('rich tier includes everything', () => {
    const input = [
      makeScored('a', 10, 'low'),
      makeScored('b', 10, 'medium'),
      makeScored('c', 10, 'high'),
    ];
    const { passed, excluded } = filterByTier(input, 'rich');
    expect(passed).toHaveLength(3);
    expect(excluded).toHaveLength(0);
  });

  it('smart tier includes low+medium always, high only if score >= 70', () => {
    const input = [
      makeScored('low-any', 10, 'low'),
      makeScored('med-any', 10, 'medium'),
      makeScored('high-low', 50, 'high'),
      makeScored('high-mid', 70, 'high'),
      makeScored('high-top', 95, 'high'),
    ];
    const { passed, excluded } = filterByTier(input, 'smart');
    expect(passed.map((s) => s.tool.name)).toEqual(['low-any', 'med-any', 'high-mid', 'high-top']);
    expect(excluded.map((e) => e.tool.name)).toEqual(['high-low']);
    expect(excluded[0].tier).toBe('smart');
    expect(excluded[0].cost).toBe('high');
    expect(excluded[0].score).toBe(50);
  });

  it('conservative tier: low always, medium only score >= 80, high never', () => {
    const input = [
      makeScored('low-low', 5, 'low'),
      makeScored('med-low', 50, 'medium'),
      makeScored('med-mid', 79, 'medium'),
      makeScored('med-top', 80, 'medium'),
      makeScored('high-top', 99, 'high'),
    ];
    const { passed, excluded } = filterByTier(input, 'conservative');
    expect(passed.map((s) => s.tool.name)).toEqual(['low-low', 'med-top']);
    expect(excluded.map((e) => e.tool.name).sort()).toEqual(['high-top', 'med-low', 'med-mid']);
    const highExcl = excluded.find((e) => e.tool.name === 'high-top');
    expect(highExcl?.reason).toContain('conservative excludes high-cost');
    const medExcl = excluded.find((e) => e.tool.name === 'med-mid');
    expect(medExcl?.reason).toContain('score ≥ 80');
  });

  it('heuristic cost is used when override is absent', () => {
    // A hook with no override — heuristic says 'low', so conservative should pass it.
    const hookTool: ScoredTool = {
      tool: {
        name: 'hook-no-override',
        repo: 'example/hook',
        category: 'hook',
        description: '',
        authRequired: false,
        networkRequired: 'none',
        installMethod: 'git-clone',
        installCommands: [],
        prerequisites: [],
        tags: ['hooks'],
        maturityFit: ['growing'],
      },
      score: 10,
      reasons: [],
    };
    const { passed } = filterByTier([hookTool], 'conservative');
    expect(passed).toHaveLength(1);
  });

  it('excluded entries carry tier/cost/score metadata', () => {
    const { excluded } = filterByTier([makeScored('x', 40, 'high')], 'smart');
    expect(excluded[0]).toMatchObject({
      tier: 'smart',
      cost: 'high',
      score: 40,
    });
    expect(excluded[0].reason).toMatch(/tier-filter/);
  });
});
