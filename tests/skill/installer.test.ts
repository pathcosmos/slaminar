import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getSkillStatus,
  getUserSkillDir,
  getUserSkillPath,
  installSkill,
  uninstallSkill,
} from '../../src/skill/installer.js';

describe('skill installer', () => {
  let fakeHome: string;
  let originalHome: string | undefined;
  let originalXdg: string | undefined;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-skill-test-'));
    originalHome = process.env.HOME;
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.HOME = fakeHome;
    // Put the backup dir inside the fake home too, so cleanup is atomic.
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalXdg;
  });

  it('resolves the user skill dir under the fake HOME', () => {
    expect(getUserSkillDir()).toBe(join(fakeHome, '.claude', 'skills', 'slaminar'));
  });

  it('installs SKILL.md when none exists', () => {
    const result = installSkill();
    expect(result.status).toBe('installed');
    expect(existsSync(result.path)).toBe(true);
    expect(readFileSync(result.path, 'utf-8')).toMatch(/^---/);
    expect(result.backupPath).toBeUndefined();
  });

  it('is idempotent on second install', () => {
    installSkill();
    const again = installSkill();
    expect(again.status).toBe('unchanged');
  });

  it('backs up and updates when existing content differs', () => {
    mkdirSync(getUserSkillDir(), { recursive: true });
    writeFileSync(getUserSkillPath(), 'user-authored skill\n', 'utf-8');

    const result = installSkill();
    expect(result.status).toBe('updated');
    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath!)).toBe(true);
    expect(readFileSync(result.backupPath!, 'utf-8')).toBe('user-authored skill\n');
  });

  it('reinstalls with --force even when content is identical (still creates backup)', () => {
    installSkill();
    const forced = installSkill({ force: true });
    expect(forced.status).toBe('updated');
    expect(forced.backupPath).toBeDefined();
  });

  it('reports status correctly before and after install', () => {
    let status = getSkillStatus();
    expect(status.installed).toBe(false);
    expect(status.bundledAvailable).toBe(true);

    installSkill();
    status = getSkillStatus();
    expect(status.installed).toBe(true);
    expect(status.contentMatches).toBe(true);
  });

  it('detects drift from bundled version', () => {
    installSkill();
    writeFileSync(getUserSkillPath(), 'modified by user\n', 'utf-8');
    const status = getSkillStatus();
    expect(status.installed).toBe(true);
    expect(status.contentMatches).toBe(false);
  });

  it('uninstalls and removes the file', () => {
    installSkill();
    const result = uninstallSkill();
    expect(result.removed).toBe(true);
    expect(result.restoredFromBackup).toBe(false);
    expect(existsSync(getUserSkillPath())).toBe(false);
  });

  it('restores previous SKILL.md from backup on uninstall', () => {
    mkdirSync(getUserSkillDir(), { recursive: true });
    writeFileSync(getUserSkillPath(), 'user-authored skill\n', 'utf-8');

    installSkill(); // creates a backup
    const result = uninstallSkill();

    expect(result.removed).toBe(true);
    expect(result.restoredFromBackup).toBe(true);
    expect(readFileSync(getUserSkillPath(), 'utf-8')).toBe('user-authored skill\n');
  });

  it('returns a benign result when nothing is installed', () => {
    const result = uninstallSkill();
    expect(result.removed).toBe(false);
    expect(result.restoredFromBackup).toBe(false);
  });
});
