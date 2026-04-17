/**
 * Weekly npm registry version check (telemetry policy B+C).
 *
 * Privacy: the only network call is a standard GET to
 * `https://registry.npmjs.org/slaminar/latest` — the same call `npm info`
 * makes. No user identifier, no payload. Fail-soft everywhere so a CLI
 * command is never blocked by a failed version check.
 */

import chalk from 'chalk';
import type { UpdateInfo, UserDefaults } from '../types/index.js';
import { loadDefaults, saveDefaults } from './defaults.js';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/slaminar/latest';
const CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 3_000;

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

async function fetchLatestVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(NPM_REGISTRY_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function persistCheck(
  defaults: UserDefaults,
  latestVersion: string | null,
): void {
  try {
    saveDefaults({
      ...defaults,
      updateCheck: {
        ...defaults.updateCheck,
        lastCheckedAt: new Date().toISOString(),
        latestKnownVersion: latestVersion ?? defaults.updateCheck.latestKnownVersion,
      },
    });
  } catch {
    // Defaults file couldn't be written — don't block the CLI.
  }
}

export interface CheckOptions {
  force?: boolean;
  disabledViaFlag?: boolean;
}

export async function checkForUpdate(
  currentVersion: string,
  options: CheckOptions = {},
): Promise<UpdateInfo | null> {
  if (options.disabledViaFlag) return null;

  let defaults: UserDefaults;
  try {
    defaults = loadDefaults();
  } catch {
    return null;
  }

  if (!defaults.telemetry.versionCheck) return null;

  const last = defaults.updateCheck.lastCheckedAt
    ? new Date(defaults.updateCheck.lastCheckedAt).getTime()
    : 0;
  const cached = defaults.updateCheck.latestKnownVersion;
  const cacheFresh = !options.force && Date.now() - last < CHECK_INTERVAL_MS;

  let latest: string | null;
  if (cacheFresh && cached) {
    latest = cached;
  } else {
    latest = await fetchLatestVersion();
    persistCheck(defaults, latest);
  }

  if (!latest) return null;
  if (defaults.updateCheck.skipVersions.includes(latest)) return null;
  if (compareSemver(latest, currentVersion) <= 0) return null;

  return {
    current: currentVersion,
    latest,
    message: `slaminar ${latest} is available (current: ${currentVersion}). Update with \`npm install -g slaminar\`.`,
  };
}

export function formatUpdateNotice(info: UpdateInfo): string {
  return chalk.yellow(`ℹ ${info.message}`);
}

/**
 * Non-blocking helper for every CLI command to invoke up front.
 * Swallows all errors — never prevents the real command from running.
 */
export async function maybePrintUpdateNotice(
  currentVersion: string,
  options: CheckOptions = {},
): Promise<void> {
  try {
    const info = await checkForUpdate(currentVersion, options);
    if (info) console.error(formatUpdateNotice(info));
  } catch {
    // Silent.
  }
}
