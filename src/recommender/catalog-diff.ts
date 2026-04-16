import chalk from 'chalk';
import type { CatalogTool } from '../types/index.js';

export interface CatalogDiff {
  added: string[];
  removed: string[];
  deprecated: string[];
  updated: string[];
  versionChange: { old: string; new: string } | null;
}

export function diffCatalogs(
  oldTools: CatalogTool[],
  newTools: CatalogTool[],
  oldVersion?: string,
  newVersion?: string,
): CatalogDiff {
  const oldMap = new Map(oldTools.map((t) => [t.name, t]));
  const newMap = new Map(newTools.map((t) => [t.name, t]));

  const added: string[] = [];
  const removed: string[] = [];
  const deprecated: string[] = [];
  const updated: string[] = [];

  for (const name of newMap.keys()) {
    if (!oldMap.has(name)) {
      added.push(name);
    }
  }

  for (const name of oldMap.keys()) {
    if (!newMap.has(name)) {
      removed.push(name);
    }
  }

  for (const [name, newTool] of newMap) {
    const oldTool = oldMap.get(name);
    if (!oldTool) continue;

    if (newTool.deprecated && !oldTool.deprecated) {
      deprecated.push(name);
    }

    if (
      newTool.description !== oldTool.description ||
      newTool.installMethod !== oldTool.installMethod ||
      JSON.stringify(newTool.tags) !== JSON.stringify(oldTool.tags)
    ) {
      updated.push(name);
    }
  }

  const versionChange =
    oldVersion !== undefined && newVersion !== undefined && oldVersion !== newVersion
      ? { old: oldVersion, new: newVersion }
      : null;

  return { added, removed, deprecated, updated, versionChange };
}

export function formatDiff(diff: CatalogDiff): string {
  const lines: string[] = [];

  if (diff.versionChange) {
    lines.push(
      `Version: ${diff.versionChange.old} → ${diff.versionChange.new}`,
    );
  }

  if (diff.added.length > 0) {
    lines.push('');
    lines.push(chalk.green('Added:'));
    for (const name of diff.added) {
      lines.push(chalk.green(`  + ${name}`));
    }
  }

  if (diff.removed.length > 0) {
    lines.push('');
    lines.push(chalk.red('Removed:'));
    for (const name of diff.removed) {
      lines.push(chalk.red(`  - ${name}`));
    }
  }

  if (diff.deprecated.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Deprecated:'));
    for (const name of diff.deprecated) {
      lines.push(chalk.yellow(`  ⚠ ${name}`));
    }
  }

  if (diff.updated.length > 0) {
    lines.push('');
    lines.push(chalk.blue('Updated:'));
    for (const name of diff.updated) {
      lines.push(chalk.blue(`  ~ ${name}`));
    }
  }

  if (lines.length === 0) {
    return 'No changes detected.';
  }

  return lines.join('\n');
}
