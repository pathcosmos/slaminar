import { randomBytes } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { BackupRecord } from '../types/index.js';

const BK_DIR = '.slaminar/.bk';
const MANIFEST_FILE = 'manifest.json';

function ensureBkDir(root: string): void {
  mkdirSync(join(root, BK_DIR), { recursive: true });
}

export function backupFile(root: string, relativePath: string): BackupRecord {
  const sourcePath = join(root, relativePath);
  if (!existsSync(sourcePath)) {
    throw new Error(`Cannot backup: file does not exist: ${relativePath}`);
  }

  ensureBkDir(root);

  const hex = randomBytes(3).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const backupName = `${hex}_${timestamp}.dat`;
  const backupPath = `${BK_DIR}/${backupName}`;

  copyFileSync(sourcePath, join(root, backupPath));

  return {
    originalPath: relativePath,
    backupPath,
    timestamp,
  };
}

export function restoreFile(root: string, record: BackupRecord): boolean {
  const backupFullPath = join(root, record.backupPath);
  const originalFullPath = join(root, record.originalPath);
  if (!existsSync(backupFullPath)) {
    // Backup file missing — cannot restore
    return false;
  }
  const destDir = dirname(originalFullPath);
  mkdirSync(destDir, { recursive: true });
  copyFileSync(backupFullPath, originalFullPath);
  return true;
}

export function readManifest(root: string): BackupRecord[] {
  const manifestPath = join(root, BK_DIR, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return [];
  }
  try {
    const data = readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    // Corrupted manifest — return empty, don't crash
    return [];
  }
}

export function writeManifest(root: string, records: BackupRecord[]): void {
  ensureBkDir(root);
  const manifestPath = join(root, BK_DIR, MANIFEST_FILE);
  writeFileSync(manifestPath, JSON.stringify(records, null, 2));
}
