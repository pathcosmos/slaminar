import { getCatalog } from './catalog.js';
import { scoreTool } from './scorer.js';
import { detectConflicts } from './conflict-detector.js';
import type { ProjectProfile, RecommendationPlan, ScoredTool, CatalogTool } from '../types/index.js';

const MATURITY_LIMITS: Record<string, number> = {
  greenfield: 2,
  early: 3,
  growing: 5,
  mature: 7,
};

export function recommend(profile: ProjectProfile): RecommendationPlan {
  const catalog = getCatalog();
  const excluded: { tool: CatalogTool; reason: string }[] = [];

  // Filter auth-required
  const eligible: CatalogTool[] = [];
  for (const tool of catalog) {
    if (tool.authRequired) {
      excluded.push({ tool, reason: 'requires external authentication' });
    } else {
      eligible.push(tool);
    }
  }

  // Score
  const scored = eligible
    .map(tool => scoreTool(tool, profile))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Detect conflicts among scored tools
  const conflicts = detectConflicts(scored.map(s => s.tool));

  // Resolve overlaps: remove losers
  const toRemove = new Set<string>();
  for (const conflict of conflicts) {
    if (conflict.relation === 'overlap' && conflict.winner) {
      const loser = conflict.tools.find(t => t !== conflict.winner);
      if (loser) toRemove.add(loser);
    }
  }

  const afterConflicts = scored.filter(s => {
    if (toRemove.has(s.tool.name)) {
      excluded.push({ tool: s.tool, reason: `overlap with ${[...toRemove].find(n => n !== s.tool.name) ?? 'another tool'} — removed` });
      return false;
    }
    return true;
  });

  // Apply limit
  const maxTools = MATURITY_LIMITS[profile.maturity] ?? 5;
  const recommended = afterConflicts.slice(0, maxTools);
  const overLimit = afterConflicts.slice(maxTools);
  for (const s of overLimit) {
    excluded.push({ tool: s.tool, reason: 'tool count limit exceeded' });
  }

  return { recommended, excluded, conflicts, maxTools };
}
