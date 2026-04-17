/**
 * Batch-apply — runs `init()` (or the v0.7 `update()` where appropriate)
 * across an approved list of discovered projects. Sequential, failure-
 * tolerant, and writes a single markdown audit trail under
 * `~/.config/slaminar/setup-logs/` so the user can see what happened.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { init } from '../core/pipeline.js';
import { update } from '../core/updater.js';
import { getConfigDir } from '../auth/config.js';
import type {
  BatchApplyOptions,
  BatchApplyResult,
  DiscoveredProject,
} from '../types/index.js';

function tildify(path: string): string {
  const home = homedir();
  if (path.startsWith(home + '/')) return '~/' + path.slice(home.length + 1);
  return path;
}

function writeSummary(result: BatchApplyResult, dryRun: boolean): string | null {
  try {
    const dir = join(getConfigDir(), 'setup-logs');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:]/g, '-').slice(0, 19);
    const file = join(dir, `batch-${stamp}.md`);

    const lines: string[] = [
      `# slaminar batch apply — ${new Date().toISOString()}`,
      '',
      `Mode: ${dryRun ? '**dry-run** (no files written)' : 'apply'}`,
      `Attempted: ${result.attempted}`,
      `Succeeded: ${result.succeeded.length}, Failed: ${result.failed.length}, Skipped: ${result.skipped.length}`,
      `Elapsed: ${result.elapsedMs}ms`,
      '',
    ];

    if (result.succeeded.length > 0) {
      lines.push('## Succeeded');
      for (const s of result.succeeded) {
        lines.push(`- \`${tildify(s.root)}\` → ${s.action}${s.reportPath ? ` (report: ${tildify(s.reportPath)})` : ''}`);
      }
      lines.push('');
    }
    if (result.failed.length > 0) {
      lines.push('## Failed');
      for (const f of result.failed) {
        lines.push(`- \`${tildify(f.root)}\` — ${f.reason}`);
      }
      lines.push('');
    }
    if (result.skipped.length > 0) {
      lines.push('## Skipped');
      for (const s of result.skipped) {
        lines.push(`- \`${tildify(s.root)}\` — ${s.reason}`);
      }
      lines.push('');
    }

    writeFileSync(file, lines.join('\n'), 'utf-8');
    return file;
  } catch {
    return null;
  }
}

export async function batchApply(
  projects: DiscoveredProject[],
  options: BatchApplyOptions = {},
): Promise<BatchApplyResult> {
  const started = Date.now();
  const dryRun = options.dryRun ?? true;
  const onlyNew = options.onlyNew ?? false;

  const result: BatchApplyResult = {
    attempted: 0,
    succeeded: [],
    failed: [],
    skipped: [],
    elapsedMs: 0,
    summaryPath: null,
  };

  for (const project of projects) {
    if (project.suggestedAction === 'skip') {
      result.skipped.push({
        root: project.root,
        reason: project.skipReason ?? 'unsupported',
      });
      continue;
    }
    if (onlyNew && project.status !== 'new') {
      result.skipped.push({
        root: project.root,
        reason: '--only-new filter excluded this project',
      });
      continue;
    }

    result.attempted += 1;

    try {
      if (project.suggestedAction === 'update' && project.status === 'configured') {
        await update(project.root, { dryRun });
        result.succeeded.push({ root: project.root, action: 'update' });
      } else {
        const initOut = await init(project.root, {
          dryRun,
          catalogUrl: options.catalogUrl,
          catalogMode: options.catalogMode,
        });
        result.succeeded.push({
          root: project.root,
          action: 'init',
          reportPath: initOut.reportPath || undefined,
        });
      }
    } catch (err) {
      result.failed.push({
        root: project.root,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  result.elapsedMs = Date.now() - started;
  result.summaryPath = writeSummary(result, dryRun);
  return result;
}
