/**
 * Team config auto-import (F6) — when `slaminar setup` runs inside a directory
 * that already has a team-committed `.slaminar/config.json`, offer to copy
 * the catalog URL/mode into the user's personal `defaults.json` so the same
 * catalog source is used everywhere (not just in this one project).
 *
 * This is strictly opt-in (interactive confirm) and only triggers when the
 * project's `catalogUrl` is non-empty AND differs from the user's current
 * default.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { TeamConfig } from '../types/index.js';
import { loadTeamConfig } from '../team/config.js';
import { loadDefaults, saveDefaults } from '../setup/defaults.js';

export interface TeamImportCandidate {
  projectRoot: string;
  teamConfig: TeamConfig;
  reason: 'different-url' | 'first-import';
}

/**
 * Detect whether the given cwd has a team-committed `.slaminar/config.json`
 * with a non-trivial custom catalog that differs from the user's defaults.
 * Returns null when there's nothing worth prompting about.
 */
export function detectTeamConfig(cwd: string): TeamImportCandidate | null {
  const configPath = join(cwd, '.slaminar', 'config.json');
  if (!existsSync(configPath)) return null;

  let team: TeamConfig;
  try {
    team = loadTeamConfig(cwd);
  } catch {
    return null;
  }

  if (!team.catalogUrl) return null;

  const defaults = loadDefaults();
  if (defaults.catalog.url === team.catalogUrl) return null;

  const reason: TeamImportCandidate['reason'] = defaults.catalog.url ? 'different-url' : 'first-import';
  return { projectRoot: cwd, teamConfig: team, reason };
}

export interface ImportResult {
  imported: boolean;
  previousUrl: string;
  newUrl: string;
  summary: string;
}

/**
 * Apply the team config's catalog into the user's defaults.json. Callers
 * should gate this behind a confirmation prompt — no confirmation is done
 * here so `--yes` / CI flows can drive it deterministically.
 */
export function importTeamCatalog(candidate: TeamImportCandidate): ImportResult {
  const defaults = loadDefaults();
  const previousUrl = defaults.catalog.url;
  const next = {
    ...defaults,
    catalog: {
      ...defaults.catalog,
      url: candidate.teamConfig.catalogUrl,
      mode: candidate.teamConfig.catalogMode,
    },
  };
  saveDefaults(next);
  return {
    imported: true,
    previousUrl,
    newUrl: candidate.teamConfig.catalogUrl,
    summary: `Imported ${candidate.teamConfig.catalogUrl} (${candidate.teamConfig.catalogMode}) from ${candidate.projectRoot}`,
  };
}
