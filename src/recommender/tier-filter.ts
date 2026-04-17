import { resolveTokenCost } from './token-cost.js';
import type { ExcludedTool, ScoredTool, TokenCost, TokenTier } from '../types/index.js';

const MEDIUM_THRESHOLD_CONSERVATIVE = 80;
const HIGH_THRESHOLD_SMART = 70;

export function filterByTier(scored: ScoredTool[], tier: TokenTier): {
  passed: ScoredTool[];
  excluded: ExcludedTool[];
} {
  const passed: ScoredTool[] = [];
  const excluded: ExcludedTool[] = [];

  for (const s of scored) {
    const cost = resolveTokenCost(s.tool);
    if (shouldInclude(tier, cost, s.score)) {
      passed.push(s);
    } else {
      excluded.push({
        tool: s.tool,
        reason: exclusionReason(tier, cost, s.score),
        tier,
        cost,
        score: s.score,
      });
    }
  }

  return { passed, excluded };
}

function shouldInclude(tier: TokenTier, cost: TokenCost, score: number): boolean {
  if (tier === 'rich') return true;
  if (tier === 'smart') {
    if (cost === 'high') return score >= HIGH_THRESHOLD_SMART;
    return true;
  }
  // conservative
  if (cost === 'low') return true;
  if (cost === 'medium') return score >= MEDIUM_THRESHOLD_CONSERVATIVE;
  return false;
}

function exclusionReason(tier: TokenTier, cost: TokenCost, score: number): string {
  if (tier === 'conservative' && cost === 'high') {
    return `tier-filter: conservative excludes high-cost tools`;
  }
  if (tier === 'conservative' && cost === 'medium') {
    return `tier-filter: conservative requires score ≥ ${MEDIUM_THRESHOLD_CONSERVATIVE} for medium-cost tools (got ${score})`;
  }
  if (tier === 'smart' && cost === 'high') {
    return `tier-filter: smart requires score ≥ ${HIGH_THRESHOLD_SMART} for high-cost tools (got ${score})`;
  }
  return `tier-filter: ${tier} excludes ${cost}-cost (score ${score})`;
}
