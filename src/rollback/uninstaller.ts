import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readManifest, restoreFile } from '../placer/backup.js';
import { loadTeamConfig, saveTeamConfig } from '../team/config.js';

export interface UninstallResult {
  restoredFiles: string[];
  deletedFiles: string[];
  deletedDirs: string[];
  /** v0.9.1 P0-2: files whose backup was missing, so restore was skipped. */
  missingBackups: string[];
}

export function uninstall(root: string): UninstallResult {
  const result: UninstallResult = {
    restoredFiles: [],
    deletedFiles: [],
    deletedDirs: [],
    missingBackups: [],
  };

  // 1. Read backup manifest and restore each backup.
  // v0.9.1 P0-2: respect restoreFile()'s return value so we don't silently
  // claim success when the backup blob is missing. Callers (e.g. CLI) can
  // surface `missingBackups` to warn the user of partial restore.
  const records = readManifest(root);
  for (const record of records) {
    const restored = restoreFile(root, record);
    if (restored) {
      result.restoredFiles.push(record.originalPath);
    } else {
      result.missingBackups.push(record.originalPath);
    }
  }

  // 2. Delete slaminar-generated plugin directory
  const generatedDir = join(root, '.claude/plugins/slaminar-generated');
  if (existsSync(generatedDir)) {
    rmSync(generatedDir, { recursive: true, force: true });
    result.deletedDirs.push('.claude/plugins/slaminar-generated');
  }

  // 3. Delete .slaminar directory
  const slaminarDir = join(root, '.slaminar');
  if (existsSync(slaminarDir)) {
    rmSync(slaminarDir, { recursive: true, force: true });
    result.deletedDirs.push('.slaminar');
  }

  return result;
}

export function removeTool(root: string, toolName: string): void {
  const config = loadTeamConfig(root);
  config.approvedTools = config.approvedTools.filter((t) => t !== toolName);
  saveTeamConfig(root, config);
}
