import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { TeamConfig, LocalConfig } from '../types/index.js';

const SLAMINAR_DIR = '.slaminar';
const TEAM_CONFIG_FILE = 'config.json';
const LOCAL_CONFIG_FILE = 'config.local.json';

const DEFAULT_TEAM: TeamConfig = {
  slaminarVersion: '0.1.0',
  excludeAuthTools: true,
  fileCountCap: 10000,
  approvedTools: [],
  catalogVersion: '',
};

const DEFAULT_LOCAL: LocalConfig = {
  aiMode: 'auto',
  personalTools: [],
};

function slaminarDir(root: string): string {
  return join(root, SLAMINAR_DIR);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filePath: string, defaults: T): T {
  if (!existsSync(filePath)) {
    return { ...defaults };
  }
  const raw = readFileSync(filePath, 'utf-8');
  return { ...defaults, ...JSON.parse(raw) };
}

function writeJson<T>(filePath: string, data: T): void {
  const dir = join(filePath, '..');
  ensureDir(dir);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function loadTeamConfig(root: string): TeamConfig {
  return readJson(join(slaminarDir(root), TEAM_CONFIG_FILE), DEFAULT_TEAM);
}

export function loadLocalConfig(root: string): LocalConfig {
  return readJson(join(slaminarDir(root), LOCAL_CONFIG_FILE), DEFAULT_LOCAL);
}

export function saveTeamConfig(root: string, config: TeamConfig): void {
  writeJson(join(slaminarDir(root), TEAM_CONFIG_FILE), config);
}

export function saveLocalConfig(root: string, config: LocalConfig): void {
  writeJson(join(slaminarDir(root), LOCAL_CONFIG_FILE), config);
}

export function ensureGitignore(root: string): void {
  const dir = slaminarDir(root);
  ensureDir(dir);
  const gitignorePath = join(dir, '.gitignore');
  const content = `config.local.json\nstate.json\n.bk/\n`;
  writeFileSync(gitignorePath, content, 'utf-8');
}
