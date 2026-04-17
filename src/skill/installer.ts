/**
 * Claude Code skill installer — places slaminar's SKILL.md into the user's
 * global skill directory (`~/.claude/skills/slaminar/`) so Claude Code can
 * discover and invoke it.
 *
 * Safety:
 *   - Idempotent: identical content is a no-op.
 *   - Different existing content is backed up before overwrite (unless
 *     `force` is set, which still creates a backup).
 *   - All filesystem errors are captured and returned as `{ status: 'failed' }`.
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  SkillInstallResult,
  SkillStatus,
  SkillUninstallResult,
} from '../types/index.js';

const SKILL_FILENAME = 'SKILL.md';
const BACKUP_DIR_NAME = 'skill-backups';

export function getUserSkillDir(): string {
  return join(homedir(), '.claude', 'skills', 'slaminar');
}

export function getUserSkillPath(): string {
  return join(getUserSkillDir(), SKILL_FILENAME);
}

export function getBundledSkillPath(): string {
  // This file compiles to `dist/skill/installer.js`. `copy-assets.mjs` places
  // `SKILL.md` in the same directory, so we resolve it next to our own module.
  const thisFile = fileURLToPath(import.meta.url);
  return join(dirname(thisFile), SKILL_FILENAME);
}

function getSkillBackupDir(): string {
  const xdgHome = process.env.XDG_CONFIG_HOME;
  const base = xdgHome ? xdgHome : join(homedir(), '.config');
  return join(base, 'slaminar', BACKUP_DIR_NAME);
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function readIfExists(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function backupExisting(existingPath: string): string {
  const backupDir = getSkillBackupDir();
  mkdirSync(backupDir, { recursive: true });
  const hex = randomBytes(3).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const backupPath = join(backupDir, `SKILL_${hex}_${timestamp}.md`);
  copyFileSync(existingPath, backupPath);
  return backupPath;
}

function findLatestBackup(): string | null {
  const backupDir = getSkillBackupDir();
  if (!existsSync(backupDir)) return null;
  try {
    const entries = readdirSync(backupDir)
      .filter((name) => name.startsWith('SKILL_') && name.endsWith('.md'))
      .map((name) => {
        const full = join(backupDir, name);
        return { name, full, mtime: statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return entries[0]?.full ?? null;
  } catch {
    return null;
  }
}

export interface InstallOptions {
  force?: boolean;
  silent?: boolean;
}

export function installSkill(options: InstallOptions = {}): SkillInstallResult {
  const targetPath = getUserSkillPath();
  const targetDir = getUserSkillDir();
  const sourcePath = getBundledSkillPath();

  const bundled = readIfExists(sourcePath);
  if (bundled === null) {
    return {
      status: 'failed',
      path: targetPath,
      reason: 'bundled-missing',
      message: `Bundled SKILL.md not found at ${sourcePath}`,
    };
  }

  try {
    const existing = readIfExists(targetPath);

    if (existing !== null && !options.force) {
      if (hashContent(existing) === hashContent(bundled)) {
        return {
          status: 'unchanged',
          path: targetPath,
          message: 'SKILL.md is already up to date',
        };
      }
    }

    mkdirSync(targetDir, { recursive: true });

    let backupPath: string | undefined;
    if (existing !== null) {
      backupPath = backupExisting(targetPath);
    }

    writeFileSync(targetPath, bundled, 'utf-8');

    return {
      status: existing === null ? 'installed' : 'updated',
      path: targetPath,
      backupPath,
      message:
        existing === null
          ? `Installed SKILL.md to ${targetPath}`
          : `Updated SKILL.md at ${targetPath} (backup: ${backupPath})`,
    };
  } catch (err) {
    return {
      status: 'failed',
      path: targetPath,
      reason: 'io-error',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function uninstallSkill(): SkillUninstallResult {
  const targetPath = getUserSkillPath();
  const targetDir = getUserSkillDir();

  if (!existsSync(targetPath)) {
    return {
      removed: false,
      restoredFromBackup: false,
      path: targetPath,
      message: 'Not installed — nothing to remove',
    };
  }

  try {
    const latestBackup = findLatestBackup();
    rmSync(targetPath, { force: true });

    // Remove the slaminar/ directory if it's now empty.
    try {
      rmSync(targetDir, { recursive: false });
    } catch {
      // Directory not empty or non-removable — leave it.
    }

    if (latestBackup) {
      // Restore previous SKILL.md (if user had one before slaminar install).
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(latestBackup, targetPath);
      return {
        removed: true,
        restoredFromBackup: true,
        path: targetPath,
        message: `Uninstalled and restored previous SKILL.md from ${latestBackup}`,
      };
    }

    return {
      removed: true,
      restoredFromBackup: false,
      path: targetPath,
      message: `Uninstalled ${targetPath}`,
    };
  } catch (err) {
    return {
      removed: false,
      restoredFromBackup: false,
      path: targetPath,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getSkillStatus(): SkillStatus {
  const targetPath = getUserSkillPath();
  const sourcePath = getBundledSkillPath();
  const installed = existsSync(targetPath);
  const bundled = readIfExists(sourcePath);
  const existing = readIfExists(targetPath);
  const contentMatches =
    bundled !== null && existing !== null && hashContent(bundled) === hashContent(existing);
  return {
    installed,
    path: targetPath,
    contentMatches,
    bundledAvailable: bundled !== null,
  };
}
