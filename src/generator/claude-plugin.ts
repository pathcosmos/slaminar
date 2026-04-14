import type { ProjectProfile, ProjectSnapshot, GenerationTarget } from '../types/index.js';

const PLUGIN_DIR = '.claude/plugins/slaminar-generated';

export function generatePlugin(
  profile: ProjectProfile,
  snapshot: ProjectSnapshot,
): GenerationTarget[] {
  return [
    {
      path: `${PLUGIN_DIR}/plugin.json`,
      content: generatePluginJson(profile),
      mode: 'create',
    },
    {
      path: `${PLUGIN_DIR}/skills/dev.md`,
      content: generateDevSkill(profile, snapshot),
      mode: 'create',
    },
  ];
}

function generatePluginJson(profile: ProjectProfile): string {
  const manifest = {
    name: 'slaminar-generated',
    description: `Auto-generated Claude Code plugin for ${profile.name}`,
    version: '1.0.0',
    skills: './skills',
  };
  return JSON.stringify(manifest, null, 2) + '\n';
}

function generateDevSkill(
  profile: ProjectProfile,
  snapshot: ProjectSnapshot,
): string {
  const scripts = snapshot.packages[0]?.scripts ?? {};
  const lang = profile.language;
  const conv = profile.conventions;

  const scriptKeys = Object.keys(scripts);
  const commandLines = scriptKeys.length > 0
    ? scriptKeys.map(name => `- \`npm run ${name}\` — ${scripts[name]}`).join('\n')
    : 'No commands detected.';

  const stackLines: string[] = [];
  stackLines.push(`- Language: ${lang.primary}`);
  if (lang.framework) stackLines.push(`- Framework: ${lang.framework}`);
  if (lang.buildTool) stackLines.push(`- Build: ${lang.buildTool}`);
  if (conv.testFramework) stackLines.push(`- Test: ${conv.testFramework}`);

  return `---
name: dev
description: Development workflow for ${profile.name}
---

# Development Workflow

## Available Commands

${commandLines}

## Tech Stack

${stackLines.join('\n')}
`;
}
