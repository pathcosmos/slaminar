import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readManifest, restoreFile } from '../placer/backup.js';
import { loadTeamConfig, saveTeamConfig } from '../team/config.js';

export interface UninstallResult {
  restoredFiles: string[];
  deletedFiles: string[];
  deletedDirs: string[];
}

export function uninstall(root: string): UninstallResult {
  const result: UninstallResult = {
    restoredFiles: [],
    deletedFiles: [],
    deletedDirs: [],
  };

  // 1. Read backup manifest and restore each backup
  const records = readManifest(root);
  for (const record of records) {
    restoreFile(root, record);
    result.restoredFiles.push(record.originalPath);
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
