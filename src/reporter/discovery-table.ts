/**
 * ASCII table renderer for a DiscoveryResult — mirrors the style of the
 * existing init/catalog reporters so the terminal output feels consistent.
 */

import { homedir } from 'node:os';
import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  DiscoveredProject,
  DiscoveredStatus,
  DiscoveryResult,
  SuggestedAction,
} from '../types/index.js';

function tildify(path: string): string {
  const home = homedir();
  if (path === home) return '~';
  if (path.startsWith(home + '/')) return '~/' + path.slice(home.length + 1);
  return path;
}

function statusColor(status: DiscoveredStatus): (s: string) => string {
  switch (status) {
    case 'new':
      return chalk.green;
    case 'configured':
      return chalk.cyan;
    case 'existing':
      return chalk.yellow;
    case 'unsupported':
    default:
      return chalk.dim;
  }
}

function actionLabel(action: SuggestedAction): string {
  switch (action) {
    case 'init':
      return 'init';
    case 'update':
      return 'update';
    case 'init-merge':
      return 'init+m';
    case 'skip':
    default:
      return 'skip';
  }
}

function summarizeCounts(projects: DiscoveredProject[]): string {
  const counts: Record<DiscoveredStatus, number> = {
    new: 0,
    configured: 0,
    existing: 0,
    unsupported: 0,
  };
  for (const p of projects) counts[p.status] += 1;
  const parts: string[] = [];
  if (counts.new) parts.push(`${counts.new} new`);
  if (counts.configured) parts.push(`${counts.configured} configured`);
  if (counts.existing) parts.push(`${counts.existing} existing`);
  if (counts.unsupported) parts.push(`${counts.unsupported} unsupported`);
  return parts.join(', ');
}

export function formatDiscoveryTable(result: DiscoveryResult): string {
  if (result.projects.length === 0) {
    const rootsStr = result.roots.map(tildify).join(', ');
    return `\n${chalk.dim(`No Claude Code projects found in: ${rootsStr}`)}\n`;
  }

  const table = new Table({
    head: [
      chalk.bold('Project'),
      chalk.bold('Language'),
      chalk.bold('Status'),
      chalk.bold('Suggest'),
      chalk.bold('CLAUDE.md'),
    ],
    colWidths: [34, 14, 14, 10, 12],
  });

  for (const p of result.projects) {
    const color = statusColor(p.status);
    const display = tildify(p.root);
    const truncated = display.length > 32 ? display.slice(0, 29) + '...' : display;
    table.push([
      truncated,
      p.language ?? chalk.dim('—'),
      color(p.status),
      actionLabel(p.suggestedAction),
      p.hasClaudeMd && p.claudeMdLines !== null ? `${p.claudeMdLines} lines` : chalk.dim('—'),
    ]);
  }

  const summary = `\n${result.projects.length} project(s): ${summarizeCounts(result.projects)}`;
  const meta = chalk.dim(
    `  scanned ${result.totalCandidatesChecked} dirs, excluded ${result.excludedDirs}, elapsed ${result.elapsedMs}ms`,
  );
  return '\n' + table.toString() + summary + '\n' + meta + '\n';
}
