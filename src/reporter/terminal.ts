import chalk from 'chalk';
import Table from 'cli-table3';
import type { InitResult } from '../core/pipeline.js';

export function formatInitReport(result: InitResult): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.green('━━━ slaminar init complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  lines.push('');

  // Profile table
  const { profile } = result;
  const langStr = [profile.language.primary, profile.language.framework]
    .filter(Boolean)
    .join(' + ');

  const profileTable = new Table({
    style: { head: [], border: [] },
  });
  profileTable.push(
    ['Name', profile.name],
    ['Language', langStr],
    ['Pattern', profile.structure.pattern],
    ['Maturity', profile.maturity],
  );

  lines.push('  Profile:');
  for (const line of profileTable.toString().split('\n')) {
    lines.push('  ' + line);
  }
  lines.push('');

  // Generated files table
  if (result.writtenFiles.length > 0) {
    const filesTable = new Table({
      head: ['File', 'Action'],
      style: { head: ['cyan'], border: [] },
    });
    for (const file of result.writtenFiles) {
      const action = result.backedUpFiles.includes(file) ? 'merge' : 'create';
      const actionStr = action === 'create'
        ? chalk.green(action)
        : chalk.yellow(action);
      filesTable.push([file, actionStr]);
    }

    lines.push('  Generated Files:');
    for (const line of filesTable.toString().split('\n')) {
      lines.push('  ' + line);
    }
    lines.push('');
  }

  // Recommended tools table
  const { recommended } = result.recommendation;
  if (recommended.length > 0) {
    const toolsTable = new Table({
      head: ['Tool', 'Score', 'Install'],
      style: { head: ['cyan'], border: [] },
    });
    for (const { tool, score } of recommended) {
      const scoreStr = score >= 70
        ? chalk.green(String(score))
        : score >= 40
          ? chalk.yellow(String(score))
          : chalk.red(String(score));
      toolsTable.push([tool.name, scoreStr, tool.installMethod]);
    }

    lines.push('  Recommended Tools:');
    for (const line of toolsTable.toString().split('\n')) {
      lines.push('  ' + line);
    }
    lines.push('');
  }

  return lines.join('\n');
}
