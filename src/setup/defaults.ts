/**
 * User-global defaults — stored at `~/.config/slaminar/defaults.json`.
 *
 * Non-sensitive (unlike auth.json) so we save with mode 0644. I/O is
 * defensive: a malformed file is treated as absent, and any individual
 * missing section falls back to built-in defaults.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from '../auth/config.js';
import type { DefaultsSection, UserDefaults } from '../types/index.js';

export const DEFAULTS_FILENAME = 'defaults.json';

export function getDefaultsPath(): string {
  return join(getConfigDir(), DEFAULTS_FILENAME);
}

export function builtInDefaults(): UserDefaults {
  return {
    version: 1,
    savedAt: new Date(0).toISOString(),
    defaults: {
      aiMode: 'auto',
      excludeAuthTools: true,
      fileCountCap: 10000,
      verbose: false,
      tokenTier: 'smart',
    },
    catalog: {
      autoRefreshHours: 24,
      url: '',
      mode: 'replace',
    },
    discovery: {
      lastRoots: [],
      excludePatterns: ['node_modules', '.git', '.venv', 'build', 'target', 'dist'],
      maxDepth: 4,
    },
    skill: {
      autoInstall: true,
      scope: 'global',
    },
    telemetry: {
      optedIn: false,
      versionCheck: true,
    },
    updateCheck: {
      lastCheckedAt: null,
      latestKnownVersion: null,
      skipVersions: [],
    },
  };
}

function mergeWithBuiltIn(partial: unknown): UserDefaults {
  const base = builtInDefaults();
  if (typeof partial !== 'object' || partial === null) return base;
  const p = partial as Partial<UserDefaults>;
  return {
    version: 1,
    savedAt: p.savedAt ?? base.savedAt,
    defaults: { ...base.defaults, ...(p.defaults ?? {}) },
    catalog: { ...base.catalog, ...(p.catalog ?? {}) },
    discovery: { ...base.discovery, ...(p.discovery ?? {}) },
    skill: { ...base.skill, ...(p.skill ?? {}) },
    telemetry: { ...base.telemetry, ...(p.telemetry ?? {}) },
    updateCheck: { ...base.updateCheck, ...(p.updateCheck ?? {}) },
  };
}

export function loadDefaults(): UserDefaults {
  const path = getDefaultsPath();
  if (!existsSync(path)) return builtInDefaults();
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return mergeWithBuiltIn(parsed);
  } catch {
    // Corrupted file — fall back to built-in rather than crash.
    return builtInDefaults();
  }
}

export function saveDefaults(defaults: UserDefaults): string {
  const path = getDefaultsPath();
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  const toWrite: UserDefaults = { ...defaults, version: 1, savedAt: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(toWrite, null, 2) + '\n', 'utf-8');
  return path;
}

export function resetDefaultsSection(section: DefaultsSection): UserDefaults {
  const current = loadDefaults();
  const base = builtInDefaults();
  const updated: UserDefaults = { ...current, [section]: base[section] };
  saveDefaults(updated);
  return updated;
}

export function defaultsExist(): boolean {
  return existsSync(getDefaultsPath());
}
