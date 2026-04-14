import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../src/recommender/conflict-detector.js';
import type { CatalogTool } from '../../src/types/index.js';

function makeTool(name: string): CatalogTool {
  return {
    name, repo: `user/${name}`, category: 'skill', description: name,
    authRequired: false, networkRequired: 'none', installMethod: 'marketplace',
    installCommands: [`install ${name}`], prerequisites: [], tags: [],
    maturityFit: ['early', 'growing', 'mature'],
  };
}

describe('detectConflicts', () => {
  it('detects overlap between caveman and everything-claude-code', () => {
    const conflicts = detectConflicts([makeTool('caveman'), makeTool('everything-claude-code')]);
    expect(conflicts.some(c => c.relation === 'overlap')).toBe(true);
  });

  it('detects synergy between planning-with-files and get-shit-done', () => {
    const conflicts = detectConflicts([makeTool('planning-with-files'), makeTool('get-shit-done')]);
    expect(conflicts.some(c => c.relation === 'synergy')).toBe(true);
  });

  it('returns empty for unrelated tools', () => {
    const conflicts = detectConflicts([makeTool('impeccable'), makeTool('claude-hud')]);
    expect(conflicts).toHaveLength(0);
  });

  it('only returns conflicts for present tools', () => {
    const conflicts = detectConflicts([makeTool('caveman')]);
    expect(conflicts).toHaveLength(0);
  });
});
