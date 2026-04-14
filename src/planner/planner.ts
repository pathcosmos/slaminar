import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateClaudeMd } from '../generator/claude-md.js';
import { generatePlugin } from '../generator/claude-plugin.js';
import type { ProjectProfile, ProjectSnapshot, RecommendationPlan, GenerationPlan, GenerationTarget, BackupRecord } from '../types/index.js';

export function buildPlan(
  profile: ProjectProfile,
  snapshot: ProjectSnapshot,
  recommendation: RecommendationPlan
): GenerationPlan {
  const targets: GenerationTarget[] = [];
  const backups: BackupRecord[] = [];

  // CLAUDE.md
  const claudeMdContent = generateClaudeMd(profile, snapshot);
  const claudeMdExists = existsSync(join(snapshot.root, 'CLAUDE.md'));
  targets.push({
    path: 'CLAUDE.md',
    content: claudeMdContent,
    mode: claudeMdExists ? 'merge' : 'create',
  });

  // Plugin files
  const pluginTargets = generatePlugin(profile, snapshot);
  targets.push(...pluginTargets);

  // Tool installs from recommendations
  const toolInstalls = recommendation.recommended.map(r => ({
    tool: r.tool.name,
    commands: r.tool.installCommands,
  }));

  return { targets, backups, toolInstalls };
}
