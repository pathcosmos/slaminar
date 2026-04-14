import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ProjectProfile,
  RecommendationPlan,
  GenerationPlan,
} from '../types/index.js';

export interface ReportInput {
  profile: ProjectProfile;
  recommendation: RecommendationPlan;
  plan: GenerationPlan;
  writtenFiles: string[];
  backedUpFiles: string[];
}

export function generateReport(result: ReportInput): string {
  const { profile, recommendation, plan, writtenFiles, backedUpFiles } = result;
  const lang = profile.language;
  const parts: string[] = [];

  parts.push(`# slaminar Setup Report — ${profile.name}`);
  parts.push('');
  parts.push(`> Generated: ${new Date().toISOString()} | slaminar v0.1.0`);
  parts.push('');

  // Project Profile
  parts.push('## Project Profile');
  parts.push('');
  parts.push('| Field | Value |');
  parts.push('|-------|-------|');
  parts.push(`| Name | ${profile.name} |`);
  parts.push(`| Language | ${lang.primary} (${lang.framework ?? 'none'} + ${lang.buildTool ?? 'none'}) |`);
  parts.push(`| Pattern | ${profile.structure.pattern} |`);
  parts.push(`| Maturity | ${profile.maturity} |`);
  parts.push('');

  // Generated Files
  parts.push('## Generated Files');
  parts.push('');
  parts.push('| File | Action |');
  parts.push('|------|--------|');
  for (const target of plan.targets) {
    parts.push(`| ${target.path} | ${target.mode} |`);
  }
  parts.push('');

  // Recommended Tools
  parts.push('## Recommended Tools');
  parts.push('');
  parts.push('| Tool | Score | Method | Reason |');
  parts.push('|------|-------|--------|--------|');
  for (const scored of recommendation.recommended) {
    parts.push(
      `| ${scored.tool.name} | ${scored.score} | ${scored.tool.installMethod} | ${scored.reasons.join(', ')} |`,
    );
  }
  parts.push('');

  // Excluded Tools
  parts.push('## Excluded Tools');
  parts.push('');
  parts.push('| Tool | Reason |');
  parts.push('|------|--------|');
  for (const ex of recommendation.excluded) {
    parts.push(`| ${ex.tool.name} | ${ex.reason} |`);
  }
  parts.push('');

  // Backed Up Files
  parts.push('## Backed Up Files');
  parts.push('');
  parts.push('| File | Backup |');
  parts.push('|------|--------|');
  if (backedUpFiles.length === 0) {
    parts.push('| (none) | — |');
  } else {
    for (const f of backedUpFiles) {
      const backup = plan.backups.find((b) => b.originalPath === f);
      parts.push(`| ${f} | ${backup?.backupPath ?? '—'} |`);
    }
  }
  parts.push('');

  return parts.join('\n');
}

export function saveReport(root: string, content: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const relPath = `.slaminar/reports/${today}-init.md`;
  const absDir = join(root, '.slaminar', 'reports');
  mkdirSync(absDir, { recursive: true });
  writeFileSync(join(root, relPath), content, 'utf-8');
  return relPath;
}
