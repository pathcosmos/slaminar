import { getCatalog } from './catalog.js';
import { resolveCatalog } from './catalog-resolver.js';
import { scoreTool } from './scorer.js';
import { detectConflicts } from './conflict-detector.js';
import { filterByTier } from './tier-filter.js';
import type {
  ProjectProfile,
  RecommendationPlan,
  ScoredTool,
  CatalogTool,
  CatalogMode,
  ExcludedTool,
  TokenTier,
} from '../types/index.js';

const MATURITY_LIMITS: Record<string, number> = {
  greenfield: 2,
  early: 3,
  growing: 5,
  mature: 7,
};

export interface RecommendOptions {
  catalogUrl?: string;
  catalogMode?: CatalogMode;
  projectRoot?: string;
  tokenTier?: TokenTier;
}

export async function recommend(
  profile: ProjectProfile,
  options?: RecommendOptions,
): Promise<RecommendationPlan> {
  const resolved = await resolveCatalog({
    silent: true,
    catalogUrl: options?.catalogUrl,
    catalogMode: options?.catalogMode,
    projectRoot: options?.projectRoot,
  });
  const catalog = resolved.tools;
  const excluded: ExcludedTool[] = [];

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
    .map((tool) => scoreTool(tool, profile))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Detect conflicts among scored tools
  const conflicts = detectConflicts(scored.map((s) => s.tool), resolved.relations);

  // Resolve overlaps: remove losers
  const toRemove = new Map<string, string>();
  for (const conflict of conflicts) {
    if (conflict.relation === 'overlap' && conflict.winner) {
      const loser = conflict.tools.find((t) => t !== conflict.winner);
      if (loser) toRemove.set(loser, conflict.winner);
    }
  }

  const afterConflicts = scored.filter((s) => {
    if (toRemove.has(s.tool.name)) {
      const winner = toRemove.get(s.tool.name);
      excluded.push({ tool: s.tool, reason: `overlap with ${winner} — removed` });
      return false;
    }
    return true;
  });

  // v0.9: tier filter — keeps federation-agnostic, runs after overlap resolution
  // so the "winner vs loser" choice isn't confused by cost.
  const tier: TokenTier = options?.tokenTier ?? 'smart';
  const { passed: afterTier, excluded: tierExcluded } = filterByTier(afterConflicts, tier);
  excluded.push(...tierExcluded);

  // Apply limit
  const maxTools = MATURITY_LIMITS[profile.maturity] ?? 5;
  const recommended = afterTier.slice(0, maxTools);
  const overLimit = afterTier.slice(maxTools);
  for (const s of overLimit) {
    excluded.push({ tool: s.tool, reason: 'tool count limit exceeded' });
  }

  return { recommended, excluded, conflicts, maxTools };
}
