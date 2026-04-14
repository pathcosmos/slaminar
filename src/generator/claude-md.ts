import type { ProjectProfile, ProjectSnapshot } from '../types/index.js';

export function generateClaudeMd(profile: ProjectProfile, snapshot: ProjectSnapshot): string {
  const sections: string[] = [];

  // Header
  sections.push(`# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.`);

  // Overview section
  sections.push(renderOverview(profile));

  // Commands section
  sections.push(renderCommands(snapshot));

  // Architecture section
  sections.push(renderArchitecture(profile));

  // Conventions section
  sections.push(renderConventions(profile));

  // Dependencies section
  sections.push(renderDependencies(profile));

  return sections.join('\n\n') + '\n';
}

function renderOverview(profile: ProjectProfile): string {
  const lines: string[] = [];
  lines.push('<!-- slaminar:begin:overview -->');
  lines.push('## Overview');
  lines.push('');
  lines.push(`${profile.name} — ${profile.description}`);
  lines.push('');

  let langLine = `- **Language:** ${profile.language.primary}`;
  if (profile.language.framework) {
    langLine += ` (${profile.language.framework})`;
  }
  if (profile.language.buildTool) {
    langLine += `, build: ${profile.language.buildTool}`;
  }
  lines.push(langLine);
  lines.push(`- **Pattern:** ${profile.structure.pattern}`);
  lines.push(`- **Maturity:** ${profile.maturity}`);
  lines.push('<!-- slaminar:end:overview -->');

  return lines.join('\n');
}

function renderCommands(snapshot: ProjectSnapshot): string {
  const lines: string[] = [];
  lines.push('<!-- slaminar:begin:commands -->');
  lines.push('## Build & Development Commands');
  lines.push('');

  const pkg = snapshot.packages[0];
  if (pkg && Object.keys(pkg.scripts).length > 0) {
    for (const name of Object.keys(pkg.scripts)) {
      lines.push(`- \`npm run ${name}\` — ${name}`);
    }
  } else {
    lines.push('No scripts detected.');
  }

  lines.push('<!-- slaminar:end:commands -->');
  return lines.join('\n');
}

function renderArchitecture(profile: ProjectProfile): string {
  const lines: string[] = [];
  lines.push('<!-- slaminar:begin:architecture -->');
  lines.push('## Architecture');
  lines.push('');
  lines.push(`${profile.structure.pattern} project with ${profile.structure.srcLayout} layout.`);

  if (profile.structure.entryPoints.length > 0) {
    lines.push('');
    lines.push('Entry points:');
    for (const ep of profile.structure.entryPoints) {
      lines.push(`- \`${ep}\``);
    }
  }

  if (profile.structure.testPattern) {
    lines.push('');
    lines.push(`Test pattern: \`${profile.structure.testPattern}\``);
  }

  lines.push('<!-- slaminar:end:architecture -->');
  return lines.join('\n');
}

function renderConventions(profile: ProjectProfile): string {
  const lines: string[] = [];
  lines.push('<!-- slaminar:begin:conventions -->');
  lines.push('## Conventions');
  lines.push('');

  const conv = profile.conventions;
  if (conv.testFramework) lines.push(`- **Test framework:** ${conv.testFramework}`);
  if (conv.linter) lines.push(`- **Linter:** ${conv.linter}`);
  if (conv.formatter) lines.push(`- **Formatter:** ${conv.formatter}`);
  if (conv.commitStyle !== 'unknown') lines.push(`- **Commit style:** ${conv.commitStyle}`);
  if (conv.docLanguage) lines.push(`- **Doc language:** ${conv.docLanguage}`);

  lines.push('<!-- slaminar:end:conventions -->');
  return lines.join('\n');
}

function renderDependencies(profile: ProjectProfile): string {
  const lines: string[] = [];
  lines.push('<!-- slaminar:begin:dependencies -->');
  lines.push('## Key Dependencies');
  lines.push('');

  if (profile.dependencies.notable.length > 0) {
    for (const dep of profile.dependencies.notable) {
      lines.push(`- **${dep.name}** (${dep.category})`);
    }
  } else {
    lines.push('No notable dependencies detected.');
  }

  lines.push('<!-- slaminar:end:dependencies -->');
  return lines.join('\n');
}
