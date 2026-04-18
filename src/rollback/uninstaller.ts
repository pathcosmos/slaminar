import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readManifestWithStatus, restoreFile } from '../placer/backup.js';
import { loadTeamConfig, saveTeamConfig } from '../team/config.js';
import { withProjectLockSync } from '../locking/file-lock.js';

export interface UninstallResult {
  restoredFiles: string[];
  deletedFiles: string[];
  deletedDirs: string[];
  /** v0.9.1 P0-2: files whose backup was missing, so restore was skipped. */
  missingBackups: string[];
  /** v0.9.2 P0-9 (F3.c): true if manifest.json existed but was unreadable. */
  manifestCorrupt: boolean;
}

export function uninstall(root: string): UninstallResult {
  // v0.9.3 F6 fix: serialize with other writers. Uninstall clearly must not
  // race with init / update — the manifest is in flux.
  return withProjectLockSync(root, () => doUninstall(root));
}

function doUninstall(root: string): UninstallResult {
  const result: UninstallResult = {
    restoredFiles: [],
    deletedFiles: [],
    deletedDirs: [],
    missingBackups: [],
    manifestCorrupt: false,
  };

  // 1. Read backup manifest and restore each backup.
  // v0.9.1 P0-2: respect restoreFile()'s return value so we don't silently
  //   claim success when the backup blob is missing.
  // v0.9.2 P0-9 (F3.c): distinguish "no manifest" from "corrupt manifest".
  //   Previously both silently returned [] and uninstall reported success
  //   even though the user's original files could be mid-overwrite.
  const { records, status } = readManifestWithStatus(root);
  if (status === 'corrupt') {
    result.manifestCorrupt = true;
  }
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
