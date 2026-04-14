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
  ensureBkDir(root);

  const hex = randomBytes(3).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const backupName = `${hex}_${timestamp}.dat`;
  const backupPath = `${BK_DIR}/${backupName}`;

  copyFileSync(join(root, relativePath), join(root, backupPath));

  return {
    originalPath: relativePath,
    backupPath,
    timestamp,
  };
}

export function restoreFile(root: string, record: BackupRecord): void {
  const destDir = dirname(join(root, record.originalPath));
  mkdirSync(destDir, { recursive: true });
  copyFileSync(join(root, record.backupPath), join(root, record.originalPath));
}

export function readManifest(root: string): BackupRecord[] {
  const manifestPath = join(root, BK_DIR, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return [];
  }
  const data = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(data) as BackupRecord[];
}

export function writeManifest(root: string, records: BackupRecord[]): void {
  ensureBkDir(root);
  const manifestPath = join(root, BK_DIR, MANIFEST_FILE);
  writeFileSync(manifestPath, JSON.stringify(records, null, 2));
}
