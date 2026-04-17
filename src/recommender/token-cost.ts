import type { CatalogTool, TokenCost } from '../types/index.js';

const HEAVY_TAGS = new Set([
  'browser',
  'e2e',
  'playwright',
  'large-codebase',
  'knowledge-graph',
  'codebase-mapping',
  'orchestration',
  'multi-agent',
  'multi-model',
  'dashboard',
  'monitoring',
  'metrics',
  'long-running',
  'html-to-pdf',
  'lsp',
  'static-analysis',
]);

const LIGHT_TAGS = new Set([
  'token-saving',
  'optimization',
  'lightweight',
  'notification',
  'alerts',
  'safety',
  'onboarding',
  'simplicity',
]);

export function inferTokenCost(tool: CatalogTool): TokenCost {
  const tags = new Set(tool.tags ?? []);

  for (const heavy of HEAVY_TAGS) {
    if (tags.has(heavy)) return 'high';
  }

  const hasLightTag = [...LIGHT_TAGS].some((t) => tags.has(t));

  switch (tool.category) {
    case 'hook':
      return 'low';
    case 'workflow':
    case 'plugin':
    case 'skill':
    case 'agent':
      return hasLightTag ? 'low' : 'medium';
    default:
      return 'medium';
  }
}

export function resolveTokenCost(tool: CatalogTool): TokenCost {
  return tool.tokenCost ?? inferTokenCost(tool);
}

export function isOverridden(tool: CatalogTool): boolean {
  return tool.tokenCost !== undefined;
}
