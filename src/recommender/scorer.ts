import type { CatalogTool, ProjectProfile, ScoredTool } from '../types/index.js';

export function scoreTool(tool: CatalogTool, profile: ProjectProfile): ScoredTool {
  const reasons: string[] = [];

  // Auth filter
  if (tool.authRequired) {
    return { tool, score: 0, reasons: ['requires authentication'] };
  }

  // Base score
  let score = 20;
  reasons.push('base score: 20');

  // Tag matching
  for (const tag of tool.tags) {
    switch (tag) {
      case 'frontend':
        if (profile.structure.pattern === 'spa' || profile.structure.pattern === 'fullstack') {
          score += 15;
          reasons.push(`tag "${tag}" matches project structure "${profile.structure.pattern}"`);
        }
        break;
      case 'react':
        if (profile.language.framework === 'react') {
          score += 15;
          reasons.push(`tag "${tag}" matches project framework`);
        }
        break;
      case 'cli':
        if (profile.structure.pattern === 'cli') {
          score += 15;
          reasons.push(`tag "${tag}" matches project structure`);
        }
        break;
      case 'testing':
        if (profile.conventions.testFramework === null) {
          score += 15;
          reasons.push(`tag "${tag}" matches: project has no test framework`);
        }
        break;
      case 'security':
        if (profile.dependencies.notable.some((dep) => dep.category === 'server')) {
          score += 15;
          reasons.push(`tag "${tag}" matches: project has server dependencies`);
        }
        break;
      case 'large-codebase':
        if (profile.dependencies.total > 30) {
          score += 15;
          reasons.push(`tag "${tag}" matches: project has ${profile.dependencies.total} dependencies`);
        }
        break;
      case 'token-saving':
        score += 10;
        reasons.push(`tag "${tag}" always applies`);
        break;
      case 'universal':
        score += 10;
        reasons.push(`tag "${tag}" always applies`);
        break;
      default:
        break;
    }
  }

  // Maturity fit
  if (profile.maturity && tool.maturityFit.includes(profile.maturity)) {
    score += 15;
    reasons.push(`maturity "${profile.maturity}" fits tool`);
  } else {
    score -= 20;
    reasons.push(`maturity "${profile.maturity}" does not fit tool (expected: ${tool.maturityFit.join(', ')})`);
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  return { tool, score, reasons };
}
