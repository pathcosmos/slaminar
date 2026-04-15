/**
 * Authentication configuration — stored at `~/.config/slaminar/auth.json`
 *
 * Security:
 *   - File is written with 0600 permission (owner read/write only)
 *   - Contains API tokens — treat as sensitive
 *
 * Team play:
 *   - Project-level team config (.slaminar/config.json) can specify
 *     preferred provider/model but NEVER stores tokens.
 *   - Personal tokens stay in ~/.config/slaminar/auth.json only.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export type AuthProvider = 'cloudflare' | 'anthropic';

export interface CloudflareAuth {
  accountId: string;
  accountName?: string;
  apiToken: string;
  model: string;
}

export interface AnthropicAuth {
  apiKey: string;
  model: string;
}

export interface AuthConfig {
  version: 1;
  active: AuthProvider | null;
  providers: {
    cloudflare?: CloudflareAuth;
    anthropic?: AnthropicAuth;
  };
  savedAt: string;
}

function getConfigDir(): string {
  const xdgHome = process.env.XDG_CONFIG_HOME;
  const base = xdgHome ? xdgHome : join(homedir(), '.config');
  return join(base, 'slaminar');
}

export function getAuthFilePath(): string {
  return join(getConfigDir(), 'auth.json');
}

export function loadAuthConfig(): AuthConfig | null {
  const path = getAuthFilePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as AuthConfig;
  } catch {
    return null;
  }
}

export function saveAuthConfig(config: AuthConfig): string {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = getAuthFilePath();
  writeFileSync(path, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 });
  // Explicit chmod in case file already existed with different perms
  try {
    chmodSync(path, 0o600);
  } catch {
    // Non-POSIX filesystem (Windows) — skip
  }
  return path;
}

export function clearAuthConfig(): boolean {
  const path = getAuthFilePath();
  if (!existsSync(path)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

export function getActiveAuth(config: AuthConfig): CloudflareAuth | AnthropicAuth | null {
  if (!config.active) return null;
  return config.providers[config.active] ?? null;
}
